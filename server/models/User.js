const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: false },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'Pharmacist' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
