import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    productId: {
      type: Number,
    },
    productName: {
      type: String,
      required: true,
    },
    variationName: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    unit: {
      type: String,
      required: true,
      default: 'KG',
    },
    multiplier: {
      type: Number,
      required: true,
      default: 1, // Quantity of base unit deducted per unit of this variation
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0, // Cost per variation at time of sale for exact COGS profit calculation
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
      required: true,
      default: 'Walk-in Customer (عام گاہک)',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    isWalkIn: {
      type: Boolean,
      default: true,
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0, // Customer remaining balance for this bill
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'paid',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'online', 'credit_khata'],
      default: 'cash',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['completed', 'voided', 'edited'],
      default: 'completed',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

saleSchema.index({ date: -1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ status: 1 });

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
export default Sale;
