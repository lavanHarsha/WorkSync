import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  preferences?: {
    emailNotifications: boolean;
    workflowNotifications: boolean;
    autoRetryFailed: boolean;
  };
  webhookKey: string;
  /** SHA-256 of the current refresh token (null when logged out) */
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      workflowNotifications: { type: Boolean, default: true },
      autoRetryFailed: { type: Boolean, default: false },
    },
    webhookKey: {
      type: String,
      default: () => 'ws_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
