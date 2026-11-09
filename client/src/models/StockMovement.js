import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'sale_edit', 'sale_void', 'purchase_cancel', 'adjustment', 'return'],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    baseUnit: {
      type: String,
      required: true,
      default: 'KG',
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceId: {
      type: String,
      default: '',
    },
    referenceModel: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ product: 1, date: -1 });
stockMovementSchema.index({ date: -1 });
stockMovementSchema.index({ type: 1 });

const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
