const mongoose = require('mongoose');

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

async function getNextSequenceValue(sequenceName = 'productId') {
  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

module.exports = Counter;
module.exports.getNextSequenceValue = getNextSequenceValue;
