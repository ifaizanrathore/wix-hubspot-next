import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IInstallation } from '@/types';

// Omit _id from our interface — Mongoose Document provides its own _id
export type InstallationDocument = Omit<IInstallation, '_id'> & Document;

const InstallationSchema = new Schema<InstallationDocument>(
  {
    siteId: { type: String, required: true, unique: true, index: true },
    hubspotPortalId: { type: String, default: null },
    encryptedAccessToken: { type: String, default: null },
    encryptedRefreshToken: { type: String, default: null },
    tokenExpiresAt: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    isConnected: { type: Boolean, default: false },
    connectedAt: { type: Date, default: null },
    disconnectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const Installation: Model<InstallationDocument> =
  mongoose.models.Installation ||
  mongoose.model<InstallationDocument>('Installation', InstallationSchema);

export default Installation;
