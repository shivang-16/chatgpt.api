import fs from 'fs';
import { Request, Response } from 'express';
import { ChatSession } from '@google/generative-ai';
import { genAI } from '../../config/geminiConfig';
import MemoryClient from 'mem0ai';

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

export const geminiChat = async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'guest';
    const message = req.body.message;
    const files = req.files as Express.Multer.File[];

    if (!message && (!files || files.length === 0)) {
      return res.status(400).json({ message: 'No message or files provided' });
    }

    let memoryContext = '';

    if (userId) {
        await mem0.add([{ role: 'user', content: message }], { user_id: userId });
      
        const searchRes = await mem0.search(message, {
          user_id: userId,
          limit: 3,
          version: 'v2'
        }) as any;
      
        if (Array.isArray(searchRes.results)) {
          memoryContext = searchRes.results.map((r: any) => r.memory).join('\n');
        }
      }

    // 3. Prepare message components
    const parts: any[] = [];
    if (memoryContext) {
      parts.push(`Memory Context:\n${memoryContext}`);
    }
    if (message) {
      parts.push(`User: ${message}`);
    }
    if (files?.length) {
      for (const file of files) {
        const b64 = fs.readFileSync(file.path, 'base64');
        parts.push({
          inlineData: { data: b64, mimeType: file.mimetype }
        });
      }
    }

    // 4. Call Gemini
    const generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat: ChatSession = generativeModel.startChat({
      history: [],
      generationConfig: { maxOutputTokens: 2000 }
    });

    const result = await chat.sendMessageStream(parts);

    // Stream SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantResponse: any = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        assistantResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      }
    }
    res.end();

    // 5. Save assistant’s reply to memory
    if (assistantResponse) {
        await mem0.add(
          [{ role: 'assistant', content: assistantResponse }],
          { user_id: userId }
        );
      }

  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ message: 'Error processing chat', error: (err as Error).message });
  }
};
