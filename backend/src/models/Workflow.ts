import crypto from 'crypto';
import mongoose, { Document, Schema } from 'mongoose';
import { ITriggerConfig, IActionConfig, IConditionConfig } from '../types';

export interface IWorkflow extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  trigger: ITriggerConfig;
  action: IActionConfig;
  conditions?: IConditionConfig[];
  /** HMAC secret for X-WorkSync-Signature. Excluded from queries unless selected explicitly. */
  webhookSecret?: string;
  /** Polling cursor + last poll status for triggers that watch an external app. */
  triggerState?: Record<string, any>;
  enabled: boolean;
  lastExecutedAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new Schema<IWorkflow>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a workflow name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    trigger: {
      app: {
        type: String,
        required: true,
      },
      event: {
        type: String,
        required: true,
      },
      parameters: {
        type: Schema.Types.Mixed,
        default: {},
      },
      webhookId: {
        type: String,
        sparse: true,
      },
    },
    action: {
      app: {
        type: String,
        required: true,
      },
      action: {
        type: String,
        required: true,
      },
      parameters: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    conditions: [
      {
        field: { type: String },
        operator: { type: String, enum: ['equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'exists'] },
        value: { type: String },
      },
    ],
    webhookSecret: {
      type: String,
      select: false,
    },
    triggerState: {
      type: Schema.Types.Mixed,
      default: {},
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    lastExecutedAt: {
      type: Date,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

workflowSchema.index({ enabled: 1, 'trigger.app': 1 });

// Generate an HMAC secret for any workflow with a webhook trigger
workflowSchema.pre('save', function (next) {
  if (
    this.trigger?.app === 'webhook' &&
    !this.webhookSecret &&
    (this.isNew || this.isSelected('webhookSecret'))
  ) {
    this.webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Virtual for id
workflowSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
workflowSchema.set('toJSON', { virtuals: true });

export const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);
