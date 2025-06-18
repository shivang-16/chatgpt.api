import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    chat: mongoose.Schema.Types.ObjectId; // Reference to the Chat this message belongs to
    sender: 'user' | 'ai';
    content: string;
    files?: []; // Optional file field for Cloudinary uploads
    createdAt: Date;
}

const MessageSchema: Schema = new Schema({
    chat: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
    },
    files: Array,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;