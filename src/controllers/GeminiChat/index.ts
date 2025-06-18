import fs from 'fs';
import axios from 'axios';
import { Request, Response } from 'express';
import { genAI } from '../../config/geminiConfig';
import MemoryClient from 'mem0ai';
import Message from '../../models/messageModel';

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

const fetchBase64FromUrl = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
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

    // 1. RETRIEVE CONTEXT ================================================
    // 🧠 Get long-term memory from mem0
    let longTermMemory: any[] = [];
    try {
      if (userId !== 'guest') {
        const query = message || "User uploaded file(s)";
        const memories = await mem0.search(userId, query);
        longTermMemory = memories.map((mem: any) => ({
          role: mem.role,
          parts: [{ text: mem.content }]
        }));
      }
    } catch (memErr) {
      console.warn('Memory retrieval failed:', (memErr as Error).message);
    }

    // 💬 Get current chat history
    let chatHistory: any[] = [];
    if (chatId) {
      try {
        const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });
        
        // Ensure strict role alternation starting with user
        let lastRole = '';
        chatHistory = messages.reduce((acc: any[], m: any) => {
          if (m.role === 'user' && lastRole !== 'user') {
            acc.push({ role: 'user', parts: [{ text: m.content }] });
            lastRole = 'user';
          } else if (m.role === 'assistant' && lastRole !== 'model') {
            acc.push({ role: 'model', parts: [{ text: m.content }] });
            lastRole = 'model';
          }
          return acc;
        }, []);
      } catch (err) {
        console.warn('Chat history fetch failed:', (err as Error).message);
      }
    }

    // Combine memory and history with proper alternation
    const fullHistory = [...longTermMemory, ...chatHistory];

    // 2. PREPARE CURRENT MESSAGE ========================================
    const parts: any[] = [];
    const fileUrls: string[] = [];

    // 💬 Text content
    if (message) parts.push({ text: message });

    // 📎 File attachments
    if (files?.length) {
      for (const file of files) {
        try {
          // Handle remote URLs differently
          if (file.path.startsWith('http')) {
            const b64 = await fetchBase64FromUrl(file.path);
            parts.push({ inlineData: { data: b64, mimeType: file.mimetype } });
            fileUrls.push(file.path);
          } 
          // Local files
          else {
            const b64 = fs.readFileSync(file.path, 'base64');
            parts.push({ inlineData: { data: b64, mimeType: file.mimetype } });
            // Optional: Clean up temp file if needed
          }
        } catch (fileErr) {
          console.warn('File processing failed:', (fileErr as Error).message);
        }
      }
    }

    // 3. EXECUTE CHAT ====================================================
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 2000 }
    });
    
    const chat = model.startChat({ history: fullHistory });
    const result = await chat.sendMessageStream(parts);

    // 4. STREAM RESPONSE ================================================
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

    // 5. PERSIST INTERACTION ==========================================
    // 💾 Save to database (if chatId exists)
    if (chatId) {
      try {
        if (message || files.length) {
          await Message.create({
            chat: chatId,
            role: 'user',
            content: message || "Uploaded file(s)",
            attachments: fileUrls
          });
        }
        
        await Message.create({
          chat: chatId,
          role: 'assistant',
          content: assistantResponse
        });
      } catch (dbErr) {
        console.warn('DB save failed:', (dbErr as Error).message);
      }
    }

    // 🧠 Save to long-term memory
    try {
      if (userId !== 'guest') {
        const memoryData = [];
        
        if (message || files.length) {
          memoryData.push({ 
            role: 'user', 
            content: message || "User uploaded files" 
          });
        }
        
        memoryData.push({ 
          role: 'assistant', 
          content: assistantResponse 
        });
        
        await mem0.add(memoryData as { role: 'user' | 'assistant'; content: string }[], { user_id: userId });
      }
    } catch (memErr) {
      console.warn('Memory save failed:', (memErr as Error).message);
    }

  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({
      message: 'Error processing chat request',
      error: (err as Error).message,
    });
  }
};