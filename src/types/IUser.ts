import mongoose, { Document } from 'mongoose';

interface IUser extends Document {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  salt: string;
  avatar: {
    public_id: string;
    url: string;
  };
  chats: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken: string | null;
  resetTokenExpiry: Date | null;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getToken(): Promise<string>;
}

export default IUser;