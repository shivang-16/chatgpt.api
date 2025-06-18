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
        // 1. RETRIEVE CONTEXT ================================================
        // 🧠 Get long-term memory from mem0
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
        // 💬 Get current chat history
        let chatHistory = [];
        if (chatId) {
            try {
                const messages = yield messageModel_1.default.find({ chat: chatId }).sort({ createdAt: 1 });
                // Ensure strict role alternation starting with user
                let lastRole = '';
                chatHistory = messages.reduce((acc, m) => {
                    if (m.role === 'user' && lastRole !== 'user') {
                        acc.push({ role: 'user', parts: [{ text: m.content }] });
                        lastRole = 'user';
                    }
                    else if (m.role === 'assistant' && lastRole !== 'model') {
                        acc.push({ role: 'model', parts: [{ text: m.content }] });
                        lastRole = 'model';
                    }
                    return acc;
                }, []);
            }
            catch (err) {
                console.warn('Chat history fetch failed:', err.message);
            }
        }
        // Combine memory and history with proper alternation
        const fullHistory = [...longTermMemory, ...chatHistory];
        // 2. PREPARE CURRENT MESSAGE ========================================
        const parts = [];
        const fileUrls = [];
        // 💬 Text content
        if (message)
            parts.push({ text: message });
        // 📎 File attachments
        if (files === null || files === void 0 ? void 0 : files.length) {
            for (const file of files) {
                try {
                    // Handle remote URLs differently
                    if (file.path.startsWith('http')) {
                        const b64 = yield fetchBase64FromUrl(file.path);
                        parts.push({ inlineData: { data: b64, mimeType: file.mimetype } });
                        fileUrls.push(file.path);
                    }
                    // Local files
                    else {
                        const b64 = fs_1.default.readFileSync(file.path, 'base64');
                        parts.push({ inlineData: { data: b64, mimeType: file.mimetype } });
                        // Optional: Clean up temp file if needed
                    }
                }
                catch (fileErr) {
                    console.warn('File processing failed:', fileErr.message);
                }
            }
        }
        // 3. EXECUTE CHAT ====================================================
        const model = geminiConfig_1.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { maxOutputTokens: 2000 }
        });
        const chat = model.startChat({ history: fullHistory });
        const result = yield chat.sendMessageStream(parts);
        // 4. STREAM RESPONSE ================================================
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
        // 5. PERSIST INTERACTION ==========================================
        // 💾 Save to database (if chatId exists)
        if (chatId) {
            try {
                if (message || files.length) {
                    yield messageModel_1.default.create({
                        chat: chatId,
                        role: 'user',
                        content: message || "Uploaded file(s)",
                        attachments: fileUrls
                    });
                }
                yield messageModel_1.default.create({
                    chat: chatId,
                    role: 'assistant',
                    content: assistantResponse
                });
            }
            catch (dbErr) {
                console.warn('DB save failed:', dbErr.message);
            }
        }
        // 🧠 Save to long-term memory
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
