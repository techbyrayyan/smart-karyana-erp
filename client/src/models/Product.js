import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: 'KG',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'rate_list_update', // 'rate_list_upload' | 'manual_edit' | 'initial_creation'
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const variationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    multiplier: {
      type: Number,
      required: true,
      default: 1, // Quantity of baseUnit this variation consumes. e.g., 500g = 0.5 of 1kg base unit.
    },
    price: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameUrdu: {
      type: String,
      trim: true,
      default: '',
    },
    variant: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      default: 'General Kiryana',
      trim: true,
    },
    productImage: {
      type: String,
      default: '',
    },
    purchasePrice: {
      type: Number,
      required: true,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    pricePerUnit: {
      type: Number,
      default: 0,
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      default: 'KG', // Base unit: KG, Liter, Piece, Packet, Dozen, etc.
      trim: true,
    },
    unitType: {
      type: String,
      enum: ['weight', 'piece'],
      default: 'weight', // 'weight' for KG/Gram/Liter/ML, 'piece' for Piece/Packet/Dozen/Box
    },
    minStockAlert: {
      type: Number,
      default: 5,
    },
    variations: [variationSchema],
    priceHistory: [priceHistorySchema],
    lastRateListUpdate: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', nameUrdu: 'text', category: 'text', variant: 'text' });
productSchema.index({ currentStock: 1, minStockAlert: 1 });
productSchema.index({ isArchived: 1 });
productSchema.index({ productId: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
