import fs from 'fs';
import axios from 'axios';
import mime from 'mime-types';
import { Request, Response } from 'express';
import { genAI } from '../../config/geminiConfig';
import MemoryClient from 'mem0ai';
import Message from '../../models/messageModel';

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });
console.log("✅ Mem0 initialized:", !!process.env.MEM0_API_KEY);

const fetchCloudinaryFile = async (url: string): Promise<{ data: string; mimeType: string }> => {
  try {
    const cloudinaryUrl = new URL(url);
    const pathParts = cloudinaryUrl.pathname.split('/');
    const originalFormat = pathParts[pathParts.length - 1].split('.')[1];

    cloudinaryUrl.searchParams.set('f_auto', 'true');
    cloudinaryUrl.searchParams.set('fl_lossy', 'true');

    const response = await axios.get(cloudinaryUrl.toString(), {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    return {
      data: Buffer.from(response.data).toString('base64'),
      mimeType: response.headers['content-type'] ||
                mime.lookup(originalFormat || url) ||
                'application/octet-stream'
    };
  } catch (error) {
    console.error(`Cloudinary fetch error: ${url}`, error);
    throw new Error(`Failed to fetch Cloudinary file: ${url}`);
  }
};

export const geminiChat = async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'guest';
    const chatId = req.body.chatId;
    const message = req.body.message;
    const files = req.files as Express.Multer.File[];

    if (!message && (!files || files.length === 0)) {
      return res.status(400).json({ message: 'No message or files provided' });
    }

    // 🧠 Long-term memory
    let longTermMemory: any[] = [];
    try {
      if (userId !== 'guest') {
        const query = message || "User uploaded file(s)";
        console.log(`🔍 Searching memory for userId="${userId}" with query="${query}"`);
        
        const memories: any = await mem0.getAll({
          user_id: userId,
          page: 1,
          page_size: 50
        });
    
        console.log(`📦 Retrieved ${memories?.results?.length ?? 0} memory entries`);
        longTermMemory = (memories.results || [])?.map((mem: any) => ({
          role: mem.user_id === userId ? 'user' : 'model',
          parts: [{ text: mem.memory }]
        }));
      }
    } catch (memErr) {
      console.warn('⚠️ Memory retrieval failed:', (memErr as Error).message);
    }
    

    // 💬 Chat history with files
    let chatHistory: any[] = [];
    if (chatId) {
      try {
        const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });

        const historyPromises = messages.map(async (msg: any) => {
          const parts: any[] = [];

          if (msg.content) {
            parts.push({ text: msg.content });
          }

          if (msg.files?.length) {
            const filePromises = msg.files.map(async (fileUrl: string) => {
              try {
                const { data, mimeType } = await fetchCloudinaryFile(fileUrl);
                return { inlineData: { data, mimeType } };
              } catch (err) {
                console.warn(`⚠️ Skipping historical file: ${fileUrl}`, err);
                return null;
              }
            });

            const fileParts = (await Promise.all(filePromises)).filter(Boolean);
            parts.push(...fileParts);
          }

          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts
          };
        });

        const rawHistory = await Promise.all(historyPromises);

        let lastRole = '';
        chatHistory = rawHistory.filter(entry => {
          if (entry.parts.length === 0) return false;
          if (entry.role === lastRole) return false;
          lastRole = entry.role;
          return true;
        });
      } catch (err) {
        console.warn('⚠️ Chat history processing failed:', (err as Error).message);
      }
    }

    // Combine context
    const fullHistory = [...longTermMemory, ...chatHistory];

    const parts: any[] = [];
    const fileUrls: string[] = [];

    if (message) parts.push({ text: message });

    if (files?.length) {
      await Promise.all(files.map(async (file) => {
        try {
          let fileData: { data: string; mimeType: string };

          if (file.path.startsWith('http')) {
            fileData = await fetchCloudinaryFile(file.path);
          } else {
            fileData = {
              data: fs.readFileSync(file.path, 'base64'),
              mimeType: file.mimetype
            };
          }

          parts.push({
            inlineData: {
              data: fileData.data,
              mimeType: fileData.mimeType
            }
          });
          fileUrls.push(file.path);
        } catch (fileErr) {
          console.warn('⚠️ File processing failed:', (fileErr as Error).message);
        }
      }));
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 2000 }
    });

    const chat = model.startChat({ history: fullHistory });
    const result = await chat.sendMessageStream(parts);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantResponse = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        assistantResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fileUrls })}\n\n`);
    res.end();

    // 💾 Save to DB
    if (chatId) {
      try {
        if (message || files.length) {
          await Message.create({
            chat: chatId,
            role: 'user',
            content: message || "Uploaded file(s)",
            files: fileUrls
          });
        }

        await Message.create({
          chat: chatId,
          role: 'assistant',
          content: assistantResponse
        });
      } catch (dbErr) {
        console.warn('⚠️ DB save failed:', (dbErr as Error).message);
      }
    }

    // 🧠 Save to memory
    try {
      if (userId !== 'guest') {
        const memoryData = [];

        if (message || files.length) {
          memoryData.push({
            role: 'user',
            content: message || 'User uploaded files'
          });
        }

        memoryData.push({
          role: 'assistant',
          content: assistantResponse
        });

        console.log('🧠 Saving to Mem0:', { userId, memoryData });

        await mem0.add(
          memoryData.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          { user_id: userId }
        );
      }
    } catch (memErr) {
      console.warn('⚠️ Memory save failed:', (memErr as Error).message);
    }

  } catch (err) {
    console.error('❌ Gemini chat error:', err);
    res.status(500).json({
      message: 'Error processing chat request',
      error: (err as Error).message,
    });
  }
};
