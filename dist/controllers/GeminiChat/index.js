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
const geminiConfig_1 = require("../../config/geminiConfig");
const mem0ai_1 = __importDefault(require("mem0ai"));
const messageModel_1 = __importDefault(require("../../models/messageModel"));
const mem0 = new mem0ai_1.default({ apiKey: process.env.MEM0_API_KEY });
const fetchBase64FromUrl = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data).toString('base64');
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
        const parts = [];
        const fileUrls = [];
        let chatHistory = [];
        // 🗂 Fetch chat history
        try {
            if (chatId) {
                const messages = yield messageModel_1.default.find({ chat: chatId }).sort({ createdAt: 1 });
                const mappedHistory = messages
                    .map((m) => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }],
                }))
                    .filter((m) => { var _a; return typeof ((_a = m.parts[0]) === null || _a === void 0 ? void 0 : _a.text) === 'string' && m.parts[0].text.trim().length > 0; });
                while (mappedHistory.length > 0 && mappedHistory[0].role !== 'user') {
                    mappedHistory.shift();
                }
                chatHistory = mappedHistory;
            }
        }
        catch (err) {
            console.warn('Chat history fetch failed:', err.message);
        }
        // 🧠 Save user message to mem0 (optional)
        try {
            if (userId && message) {
                yield mem0.add([{ role: 'user', content: message }], { user_id: userId });
            }
        }
        catch (memErr) {
            console.warn('Memory store failed:', memErr.message);
        }
        // 💬 Add user's message
        if (message) {
            parts.push({ text: message });
        }
        // 📎 Handle file uploads
        if (files === null || files === void 0 ? void 0 : files.length) {
            for (const file of files) {
                try {
                    let b64;
                    if (file.path.startsWith('http')) {
                        b64 = yield fetchBase64FromUrl(file.path);
                        fileUrls.push(file.path);
                    }
                    else {
                        b64 = fs_1.default.readFileSync(file.path, 'base64');
                    }
                    parts.push({
                        inlineData: { data: b64, mimeType: file.mimetype },
                    });
                }
                catch (fileErr) {
                    console.warn('File processing failed:', fileErr.message);
                }
            }
        }
        // 🚀 Start Gemini chat session with PRO model
        const generativeModel = geminiConfig_1.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const chat = generativeModel.startChat({
            history: chatHistory,
            generationConfig: { maxOutputTokens: 2000 },
        });
        const result = yield chat.sendMessageStream(parts);
        // 📤 Stream response to client
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
        // 🧠 Save assistant response to mem0
        if (assistantResponse) {
            try {
                yield mem0.add([{ role: 'assistant', content: assistantResponse }], {
                    user_id: userId,
                });
            }
            catch (err) {
                console.warn('Failed to save assistant response to memory:', err.message);
            }
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
