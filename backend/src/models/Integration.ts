import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto';

export interface IIntegration extends Document {
  userId: mongoose.Types.ObjectId;
  appId: string;
  name: string;
  connected: boolean;
  connectedAt?: Date;
  /** Encrypted at rest as { __enc: string }. Use getAuthData() to read the plaintext. */
  authData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  getAuthData(): Record<string, any>;
}

const isEncrypted = (value: any): value is { __enc: string } =>
  !!value && typeof value === 'object' && typeof value.__enc === 'string';

const integrationSchema = new Schema<IIntegration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    connected: {
      type: Boolean,
      default: false,
    },
    connectedAt: {
      type: Date,
    },
    authData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique per user + appId
integrationSchema.index({ userId: 1, appId: 1 }, { unique: true });

// Encrypt authData before it is persisted (skips already-encrypted values)
integrationSchema.pre('save', function (next) {
  try {
    if (this.authData && !isEncrypted(this.authData) && Object.keys(this.authData).length > 0) {
      this.authData = { __enc: encrypt(JSON.stringify(this.authData)) };
      this.markModified('authData');
    }
    next();
  } catch (err) {
    // Message intentionally excludes authData contents
    next(err as Error);
  }
});

// Decrypt on read. Handles legacy plaintext documents transparently.
integrationSchema.methods.getAuthData = function (): Record<string, any> {
  const data = this.authData;
  if (!data) return {};
  if (!isEncrypted(data)) return data;
  return JSON.parse(decrypt(data.__enc));
};

// Never serialize authData (encrypted or not) into API responses
integrationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.authData;
    return ret;
  },
});

export const Integration = mongoose.model<IIntegration>('Integration', integrationSchema);
