import express from 'express';
import { createChat, getChatsByUserId, createMessage, getMessagesByChatId } from '../controllers/Chat';
import { checkAuth } from '../middleware/checkAuth';
import { upload } from '../middleware/multer'; // Import the upload middleware

const router = express.Router();

// Chat routes
router.post('/create', checkAuth, createChat);
router.get('/get', checkAuth, getChatsByUserId);

// Message routes
router.post('/messages/create', checkAuth, createMessage); // Apply multer middleware
router.get('/messages/:chatId', checkAuth, getMessagesByChatId);

export default router;