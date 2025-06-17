"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Chat_1 = require("../controllers/Chat");
const checkAuth_1 = require("../middleware/checkAuth");
const router = express_1.default.Router();
// Chat routes
router.post('/create', checkAuth_1.checkAuth, Chat_1.createChat);
router.get('/get', checkAuth_1.checkAuth, Chat_1.getChatsByUserId);
// Message routes
router.post('/messages/create', checkAuth_1.checkAuth, Chat_1.createMessage);
router.get('/messages/:chatId', checkAuth_1.checkAuth, Chat_1.getMessagesByChatId);
exports.default = router;
