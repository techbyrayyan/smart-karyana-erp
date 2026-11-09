import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0, // Positive balance = customer owes store (Udhaar)
    },
    lastPurchaseDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    khataPayments: [
      {
        amount: { type: Number, required: true },
        method: { type: String, default: 'cash' },
        notes: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        previousBalance: { type: Number, default: 0 },
        newBalance: { type: Number, default: 0 },
        recordedBy: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text' });
customerSchema.index({ balance: -1 });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
export default Customer;
