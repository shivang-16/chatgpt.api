import { Request, Response } from 'express';
import Chat from '../../models/chatModel';
import Message from '../../models/messageModel';
import {User} from '../../models/userModel';

// Create a new chat
export const createChat = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?._id; // Assuming user ID is available in req.user

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const newChat = new Chat({
      heading: name,
      user: userId,
    });

    await newChat.save();

    await User.findByIdAndUpdate(userId, { $push: { chats: newChat._id } });

    res.status(201).json(newChat);
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
};

// Get all chats for a user
export const getChatsByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Assuming user ID is available in req.user

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chats = await Chat.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json(chats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new message in a chat
export const createMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, content, role } = req.body;
    const userId = req.user?._id; // Assuming user ID is available in req.user

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Optional: Add a check to ensure the user owns the chat
    if (chat.user.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'User does not have access to this chat' });
    }

    const newMessage = new Message({
      chat: chatId,
      content,
      role, // 'user' or 'assistant'
    });

    await newMessage.save();

    // Optional: Add the message ID to the chat's messages array (if you add one to the schema)
    // await Chat.findByIdAndUpdate(chatId, { $push: { messages: newMessage._id } });

    res.status(201).json({success: true, newMessage});
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
};

// Get all messages for a chat
export const getMessagesByChatId = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?._id; // Assuming user ID is available in req.user

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Optional: Add a check to ensure the user owns the chat
    if (chat.user.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'User does not have access to this chat' });
    }

    const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};