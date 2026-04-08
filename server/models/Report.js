const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  submittedBy: { type: String, required: true },     // fullName of submitter
  submittedByRole: { type: String, required: true }, // role
  expiredCount: { type: Number, default: 0 },
  outOfStockCount: { type: Number, default: 0 },
  lowStockCount: { type: Number, default: 0 },
  expiredMeds: [{ name: String, batchNo: String, expiryDate: String, quantity: Number }],
  outOfStockMeds: [{ name: String, batchNo: String, minThreshold: Number }],
  lowStockMeds: [{ name: String, batchNo: String, quantity: Number, minThreshold: Number }],
  status: { type: String, default: 'pending' }, // 'pending' | 'viewed'
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
