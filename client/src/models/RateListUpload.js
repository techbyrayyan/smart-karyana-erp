import mongoose from 'mongoose';

const rateListUploadItemSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
    },
    productName: {
      type: String,
      required: true,
    },
    productNameUrdu: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: '',
    },
    unit: {
      type: String,
      default: 'KG',
    },
    unitType: {
      type: String,
      enum: ['weight', 'piece'],
      default: 'weight',
    },
    oldPrice: {
      type: Number,
      default: 0,
    },
    newPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['updated', 'new', 'unchanged', 'unmatched'],
      default: 'new',
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
  },
  { _id: true }
);

const rateListUploadSchema = new mongoose.Schema(
  {
    uploadNumber: {
      type: String,
      required: true,
      unique: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    rawImageUrl: {
      type: String,
      default: '',
    },
    totalExtracted: {
      type: Number,
      default: 0,
    },
    totalUpdated: {
      type: Number,
      default: 0,
    },
    totalNew: {
      type: Number,
      default: 0,
    },
    unmatchedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending_review', 'cancelled'],
      default: 'confirmed',
    },
    items: [rateListUploadItemSchema],
    notes: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: String,
      default: 'admin',
    },
  },
  { timestamps: true }
);

rateListUploadSchema.index({ uploadNumber: 1 });
rateListUploadSchema.index({ uploadDate: -1 });

const RateListUpload =
  mongoose.models.RateListUpload ||
  mongoose.model('RateListUpload', rateListUploadSchema);

export default RateListUpload;
