I'll create a README.md file for your project. Here's a comprehensive one that covers all the main aspects:

```markdown:/Users/shivang/Desktop/chatgpt.api/README.md
# ChatGPT API Project

A Node.js/Express API for ChatGPT-like functionality with Gemini AI integration and Cloudinary file uploads.

## Features
- User authentication (JWT)
- Chat management
- Message history
- Gemini AI integration
- File uploads to Cloudinary
- Google OAuth integration

## Tech Stack
- Node.js
- Express
- MongoDB
- Google Generative AI
- Cloudinary
- JWT Authentication

## Environment Variables
Create a `.env.local` file with these variables:
```
DB_URL=mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_api_key
MEM0_API_KEY=your_mem0_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=your_frontend_url
```

## Installation
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables
4. Run the development server:
```bash
npm run dev
```

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/google/auth` - Google OAuth
- `POST /api/chat/create` - Create new chat
- `GET /api/chat/get` - Get user chats
- `POST /api/chat/messages/create` - Create message
- `GET /api/chat/messages/:chatId` - Get chat messages
- `POST /api/gemini/chat` - Gemini AI chat (supports file uploads)

## File Uploads
Files can be uploaded to Cloudinary via:
```
POST /api/gemini/chat
```
Supported formats: JPG, PNG, GIF, PDF, DOC, DOCX

        