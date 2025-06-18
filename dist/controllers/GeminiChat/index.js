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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiChat = void 0;
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const mime_types_1 = __importDefault(require("mime-types"));
const geminiConfig_1 = require("../../config/geminiConfig");
const mem0ai_1 = __importDefault(require("mem0ai"));
const messageModel_1 = __importDefault(require("../../models/messageModel"));
const mem0 = new mem0ai_1.default({ apiKey: process.env.MEM0_API_KEY });
const fetchCloudinaryFile = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cloudinaryUrl = new URL(url);
        const pathParts = cloudinaryUrl.pathname.split('/');
        const originalFormat = pathParts[pathParts.length - 1].split('.')[1];
        cloudinaryUrl.searchParams.set('f_auto', 'true');
        cloudinaryUrl.searchParams.set('fl_lossy', 'true');
        const response = yield axios_1.default.get(cloudinaryUrl.toString(), {
            responseType: 'arraybuffer',
            timeout: 10000,
        });
        return {
            data: Buffer.from(response.data).toString('base64'),
            mimeType: response.headers['content-type'] ||
                mime_types_1.default.lookup(originalFormat || url) ||
                'application/octet-stream'
        };
    }
    catch (error) {
        console.error(`Cloudinary fetch error: ${url}`, error);
        throw new Error(`Failed to fetch Cloudinary file: ${url}`);
    }
});
const geminiChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        const userId = req.body.userId || 'guest';
        const chatId = req.body.chatId;
        const message = req.body.message;
        const files = req.files;
        if (!message && (!files || files.length === 0)) {
            return res.status(400).json({ message: 'No message or files provided' });
        }
        // 1. CONTEXT RETRIEVAL =================================================
        // 🧠 Long-term memory
        let longTermMemory = [];
        try {
            if (userId !== 'guest') {
                const query = message || "User uploaded file(s)";
                const memories = yield mem0.search(userId, query);
                longTermMemory = memories.map((mem) => ({
                    role: mem.role,
                    parts: [{ text: mem.content }]
                }));
            }
        }
        catch (memErr) {
            console.warn('Memory retrieval failed:', memErr.message);
        }
        // 💬 Chat history with files
        let chatHistory = [];
        if (chatId) {
            try {
                const messages = yield messageModel_1.default.find({ chat: chatId }).sort({ createdAt: 1 });
                // Process historical messages with files
                const historyPromises = messages.map((msg) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a;
                    const parts = [];
                    if (msg.content) {
                        parts.push({ text: msg.content });
                    }
                    if ((_a = msg.files) === null || _a === void 0 ? void 0 : _a.length) {
                        const filePromises = msg.files.map((fileUrl) => __awaiter(void 0, void 0, void 0, function* () {
                            try {
                                const { data, mimeType } = yield fetchCloudinaryFile(fileUrl);
                                return {
                                    inlineData: { data, mimeType }
                                };
                            }
                            catch (err) {
                                console.warn(`Skipping historical file: ${fileUrl}`, err);
                                return null;
                            }
                        }));
                        const fileParts = (yield Promise.all(filePromises)).filter(Boolean);
                        parts.push(...fileParts);
                    }
                    return {
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts
                    };
                }));
                const rawHistory = yield Promise.all(historyPromises);
                // Ensure role alternation
                let lastRole = '';
                chatHistory = rawHistory.filter(entry => {
                    if (entry.parts.length === 0)
                        return false;
                    if (entry.role === lastRole)
                        return false;
                    lastRole = entry.role;
                    return true;
                });
            }
            catch (err) {
                console.warn('Chat history processing failed:', err.message);
            }
        }
        // Combine context sources
        const fullHistory = [...longTermMemory, ...chatHistory];
        const parts = [];
        const fileUrls = [];
        // 💬 Text content
        if (message)
            parts.push({ text: message });
        // 📎 Current file attachments
        if (files === null || files === void 0 ? void 0 : files.length) {
            yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    let fileData;
                    if (file.path.startsWith('http')) {
                        fileData = yield fetchCloudinaryFile(file.path);
                    }
                    else {
                        fileData = {
                            data: fs_1.default.readFileSync(file.path, 'base64'),
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
                }
                catch (fileErr) {
                    console.warn('Current file processing failed:', fileErr.message);
                }
            })));
        }
        const model = geminiConfig_1.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { maxOutputTokens: 2000 }
        });
        const chat = model.startChat({ history: fullHistory });
        const result = yield chat.sendMessageStream(parts);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        let assistantResponse = '';
        try {
            for (var _d = true, _e = __asyncValues(result.stream), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                _c = _f.value;
                _d = false;
                const chunk = _c;
                const text = chunk.text();
                if (text) {
                    assistantResponse += text;
                    res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.write(`data: ${JSON.stringify({ type: 'done', fileUrls })}\n\n`);
        res.end();
        // 5. DATA PERSISTENCE =================================================
        // 💾 Save to database
        if (chatId) {
            try {
                if (message || files.length) {
                    yield messageModel_1.default.create({
                        chat: chatId,
                        role: 'user',
                        content: message || "Uploaded file(s)",
                        files: fileUrls // Store Cloudinary URLs
                    });
                }
                yield messageModel_1.default.create({
                    chat: chatId,
                    role: 'assistant',
                    content: assistantResponse
                });
            }
            catch (dbErr) {
                console.warn('Database save failed:', dbErr.message);
            }
        }
        // 🧠 Save to memory
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
                yield mem0.add(memoryData, { user_id: userId });
            }
        }
        catch (memErr) {
            console.warn('Memory save failed:', memErr.message);
        }
    }
    catch (err) {
        console.error('Gemini chat error:', err);
        res.status(500).json({
            message: 'Error processing chat request',
            error: err.message,
        });
    }
});
exports.geminiChat = geminiChat;
