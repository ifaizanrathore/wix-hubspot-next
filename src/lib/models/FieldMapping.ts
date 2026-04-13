import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IFieldMapping } from '@/types';

export type FieldMappingDocument = Omit<IFieldMapping, '_id'> & Document;

const FieldMappingSchema = new Schema<FieldMappingDocument>(
  {
    siteId: { type: String, required: true, index: true },
    wixField: { type: String, required: true },
    hubspotProperty: { type: String, required: true },
    syncDirection: {
      type: String,
      enum: ['wix_to_hubspot', 'hubspot_to_wix', 'bidirectional'],
      default: 'bidirectional',
    },
    transform: {
      type: String,
      enum: ['none', 'trim', 'lowercase', 'uppercase'],
      default: 'none',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

FieldMappingSchema.index({ siteId: 1, hubspotProperty: 1 }, { unique: true });

const FieldMapping: Model<FieldMappingDocument> =
  mongoose.models.FieldMapping ||
  mongoose.model<FieldMappingDocument>('FieldMapping', FieldMappingSchema);

export default FieldMapping;
