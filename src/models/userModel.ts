import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs"; 
import crypto from "crypto";
import IUser from "../types/IUser";

const userSchema = new Schema<IUser>({
  firstname: {
    type: String,
    required: [true, "Please enter the first name"],
  },
  lastname: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
  }],
  password: {
    type: String,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
  },
});

// Update timestamps pre-save
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Email validation
userSchema.pre("save", function (next) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    return next(new Error("Please enter a valid email address"));
  }
  next();
});

// Password hashing with bcrypt
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10); // Generate a salt
  this.password = await bcrypt.hash(this.password, salt); // Hash the password
  // No need to store salt explicitly, bcrypt handles it within the hash

  next();
});

// Method to compare password with bcrypt
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate reset token
userSchema.methods.getToken = async function (): Promise<string> {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  return resetToken;
};

export const User = mongoose.model<IUser>("User", userSchema);


