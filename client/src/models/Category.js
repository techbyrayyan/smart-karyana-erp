import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    nameUrdu: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
