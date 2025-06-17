"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/gemini.ts
const express_1 = __importDefault(require("express"));
const GeminiChat_1 = require("../controllers/GeminiChat");
const multer_1 = require("../middleware/multer");
const router = express_1.default.Router();
router.post('/chat', multer_1.upload.array('files'), GeminiChat_1.geminiChat);
exports.default = router;
