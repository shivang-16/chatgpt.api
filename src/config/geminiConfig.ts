import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config({
    path: './.env.local'
});

// Access your API key as an environment variable
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable not set.');
}

// Initializes the Generative AI model
export const genAI = new GoogleGenerativeAI(apiKey);