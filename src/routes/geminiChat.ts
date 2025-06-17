// routes/gemini.ts
import express from 'express';
import { geminiChat } from '../controllers/GeminiChat';
import { upload } from '../middleware/multer';

const router = express.Router();

router.post('/chat', upload.array('files'), geminiChat);

export default router;
