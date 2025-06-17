"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({
    path: './.env.local'
});
// Access your API key as an environment variable
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set.');
}
// Initializes the Generative AI model
exports.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
