import fs from 'fs';
import axios from 'axios';
import { Request, Response } from 'express';
import { ChatSession } from '@google/generative-ai';
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

    const parts: any[] = [];
    const fileUrls: string[] = [];
    let chatHistory: any[] = [];

    // 🗂 Fetch chat history
    try {
      if (chatId) {
        const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });

        const mappedHistory = messages
          .map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          }))
          .filter((m: any) => typeof m.parts[0]?.text === 'string' && m.parts[0].text.trim().length > 0);

        while (mappedHistory.length > 0 && mappedHistory[0].role !== 'user') {
          mappedHistory.shift();
        }

        chatHistory = mappedHistory;
      }
    } catch (err) {
      console.warn('Chat history fetch failed:', (err as Error).message);
    }

    // 🧠 Save user message to mem0 (optional)
    try {
      if (userId && message) {
        await mem0.add([{ role: 'user', content: message }], { user_id: userId });
      }
    } catch (memErr) {
      console.warn('Memory store failed:', (memErr as Error).message);
    }

    // 💬 Add user's message
    if (message) {
      parts.push({ text: message });
    }

    // 📎 Handle file uploads
    if (files?.length) {
      for (const file of files) {
        try {
          let b64: string;
          if (file.path.startsWith('http')) {
            b64 = await fetchBase64FromUrl(file.path);
            fileUrls.push(file.path);
          } else {
            b64 = fs.readFileSync(file.path, 'base64');
          }

          parts.push({
            inlineData: { data: b64, mimeType: file.mimetype },
          });
        } catch (fileErr) {
          console.warn('File processing failed:', (fileErr as Error).message);
        }
      }
    }


    // 🚀 Start Gemini chat session with PRO model
    const generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat: ChatSession = generativeModel.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 2000 },
    });

    const result = await chat.sendMessageStream(parts);

    // 📤 Stream response to client
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

    // 🧠 Save assistant response to mem0
    if (assistantResponse) {
      try {
        await mem0.add([{ role: 'assistant', content: assistantResponse }], {
          user_id: userId,
        });
      } catch (err) {
        console.warn('Failed to save assistant response to memory:', (err as Error).message);
      }
    }

  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({
      message: 'Error processing chat request',
      error: (err as Error).message,
    });
  }
};
