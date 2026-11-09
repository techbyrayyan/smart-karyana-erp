const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text' });
customerSchema.index({ balance: -1 });

module.exports = mongoose.model('Customer', customerSchema);
