import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
    heading: string;
    user: mongoose.Schema.Types.ObjectId; // Reference to the User who owns this chat
    createdAt: Date;
    updatedAt: Date;
}

const ChatSchema: Schema = new Schema({
    heading: {
        type: String,
        required: true,
        default: 'New Chat',
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update updatedAt timestamp on save
ChatSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Chat = mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;