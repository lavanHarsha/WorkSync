import mongoose, { Document, Schema } from 'mongoose';
import { ExecutionStatus, IExecutionStepLog } from '../types';

export interface IExecution extends Document {
  workflowId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  triggerData: Record<string, any>;
  actionData?: Record<string, any>;
  status: ExecutionStatus;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  logs: IExecutionStepLog[];
  jobId?: string; // BullMQ job ID for tracking
  isScheduled?: boolean; // Whether this was triggered by a schedule
  createdAt: Date;
}

const executionSchema = new Schema<IExecution>(
  {
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    triggerData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    actionData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['success', 'running', 'failed', 'queued'],
      default: 'queued',
      index: true,
    },
    error: {
      type: String,
    },
    jobId: {
      type: String,
      index: true,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // ms
    },
    logs: [
      {
        step: { type: String, enum: ['trigger', 'condition', 'action'] },
        title: { type: String },
        status: { type: String, enum: ['success', 'failed', 'skipped'] },
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
        data: { type: Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

executionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
executionSchema.set('toJSON', { virtuals: true });

export const Execution = mongoose.model<IExecution>('Execution', executionSchema);
