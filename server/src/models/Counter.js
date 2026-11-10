import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

async function getNextSequenceValue(sequenceName = 'productId') {
  const model = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
  const result = await model.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

counterSchema.statics.getNextSequenceValue = getNextSequenceValue;

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
Counter.getNextSequenceValue = getNextSequenceValue;

export { getNextSequenceValue };
export default Counter;
