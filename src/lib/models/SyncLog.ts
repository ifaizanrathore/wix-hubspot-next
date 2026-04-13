import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ISyncLog } from '@/types';

export type SyncLogDocument = Omit<ISyncLog, '_id'> & Document;

const SyncLogSchema = new Schema<SyncLogDocument>(
  {
    siteId: { type: String, required: true, index: true },
    syncId: { type: String, required: true },
    source: { type: String, enum: ['wix', 'hubspot', 'form'], required: true },
    action: { type: String, enum: ['create', 'update', 'skip', 'error'], required: true },
    wixContactId: { type: String, default: null },
    hubspotContactId: { type: String, default: null },
    status: { type: String, enum: ['success', 'error', 'skipped'], default: 'success' },
    detail: { type: String, default: '' },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true },
);

SyncLogSchema.index({ siteId: 1, createdAt: -1 });

const SyncLog: Model<SyncLogDocument> =
  mongoose.models.SyncLog ||
  mongoose.model<SyncLogDocument>('SyncLog', SyncLogSchema);

export default SyncLog;
