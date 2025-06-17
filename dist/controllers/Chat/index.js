"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesByChatId = exports.createMessage = exports.getChatsByUserId = exports.createChat = void 0;
const chatModel_1 = __importDefault(require("../../models/chatModel"));
const messageModel_1 = __importDefault(require("../../models/messageModel"));
const userModel_1 = require("../../models/userModel");
// Create a new chat
const createChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Assuming user ID is available in req.user
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const newChat = new chatModel_1.default({
            heading: name,
            user: userId,
        });
        yield newChat.save();
        yield userModel_1.User.findByIdAndUpdate(userId, { $push: { chats: newChat._id } });
        res.status(201).json(newChat);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});
exports.createChat = createChat;
// Get all chats for a user
const getChatsByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Assuming user ID is available in req.user
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const chats = yield chatModel_1.default.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(chats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getChatsByUserId = getChatsByUserId;
// Create a new message in a chat
const createMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { chatId, content, role, fileUrls } = req.body;
        console.log(fileUrls, "here");
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const chat = yield chatModel_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        // Optional: Add a check to ensure the user owns the chat
        if (chat.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'User does not have access to this chat' });
        }
        const newMessage = new messageModel_1.default({
            chat: chatId,
            content,
            role,
            files: fileUrls
        });
        yield newMessage.save();
        // Optional: Add the message ID to the chat's messages array (if you add one to the schema)
        // await Chat.findByIdAndUpdate(chatId, { $push: { messages: newMessage._id } });
        res.status(201).json({ success: true, newMessage });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});
exports.createMessage = createMessage;
// Get all messages for a chat
const getMessagesByChatId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { chatId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Assuming user ID is available in req.user
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const chat = yield chatModel_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        // Optional: Add a check to ensure the user owns the chat
        if (chat.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'User does not have access to this chat' });
        }
        const messages = yield messageModel_1.default.find({ chat: chatId }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMessagesByChatId = getMessagesByChatId;
