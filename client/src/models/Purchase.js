import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      default: 'KG',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    multiplier: {
      type: Number,
      default: 1, // Conversion to base unit
    },
    isNewProduct: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      default: 'General Supplier / Mandi',
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'udhaar', 'bank_transfer', 'card'],
      default: 'cash',
    },
    source: {
      type: String,
      enum: ['manual', 'ai_scan'],
      default: 'manual',
    },
    createdBy: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'paid',
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    invoiceImageUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['confirmed', 'draft', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ invoiceNumber: 1 });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
export default Purchase;
