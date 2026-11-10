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

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequential number.
 * Guarantees thread-safe, gap-free, non-colliding sequential IDs even under concurrency.
 * @param {string} sequenceName - Identifier for sequence (e.g. 'productId')
 * @returns {Promise<number>} - Next unique sequential integer
 */
export async function getNextSequenceValue(sequenceName = 'productId') {
  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

export default Counter;
