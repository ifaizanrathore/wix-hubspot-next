import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IContactMapping } from '@/types';

export type ContactMappingDocument = Omit<IContactMapping, '_id'> & Document;

const ContactMappingSchema = new Schema<ContactMappingDocument>(
  {
    siteId: { type: String, required: true, index: true },
    wixContactId: { type: String, required: true, index: true },
    hubspotContactId: { type: String, required: true, index: true },
    lastSyncSource: { type: String, enum: ['wix', 'hubspot', 'form'], default: null },
    lastSyncId: { type: String, default: null },
    lastSyncAt: { type: Date, default: null },
    wixLastUpdatedAt: { type: Date, default: null },
    hubspotLastUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ContactMappingSchema.index({ siteId: 1, wixContactId: 1 }, { unique: true });
ContactMappingSchema.index({ siteId: 1, hubspotContactId: 1 }, { unique: true });

const ContactMapping: Model<ContactMappingDocument> =
  mongoose.models.ContactMapping ||
  mongoose.model<ContactMappingDocument>('ContactMapping', ContactMappingSchema);

export default ContactMapping;
