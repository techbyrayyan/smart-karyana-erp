import mongoose from 'mongoose';

const rateListUploadItemSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
    },
    productName: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    productNameUrdu: {
      type: String,
      default: '',
    },
    nameUrdu: {
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
      default: 'weight',
    },
    oldPrice: {
      type: Number,
      default: 0,
    },
    newPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'new',
    },
    action: {
      type: String,
      default: 'created',
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
      type: Number,
      unique: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source: {
      type: String,
      default: 'ai_scan', // 'camera' | 'gallery' | 'document' | 'manual' | 'ai_scan'
    },
    title: {
      type: String,
      default: 'Rate List Update',
    },
    notes: {
      type: String,
      default: '',
    },
    itemsCount: {
      type: Number,
      default: 0,
    },
    newProductsCount: {
      type: Number,
      default: 0,
    },
    updatedPricesCount: {
      type: Number,
      default: 0,
    },
    unchangedPricesCount: {
      type: Number,
      default: 0,
    },
    items: [rateListUploadItemSchema],
  },
  {
    timestamps: true,
  }
);

const RateListUpload =
  mongoose.models.RateListUpload || mongoose.model('RateListUpload', rateListUploadSchema);

export default RateListUpload;
