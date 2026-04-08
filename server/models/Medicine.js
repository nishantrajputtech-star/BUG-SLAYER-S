const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batchNo: { type: String, required: true },
  expiryDate: { type: String, required: true },
  quantity: { type: Number, required: true },
  minThreshold: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Medicine', MedicineSchema);
