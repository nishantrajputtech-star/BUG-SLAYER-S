const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

// --- OTP Store (in-memory, expires in 10 min) --- //
const otpStore = {}; // { email: { otp, expiresAt } }

// Create Ethereal test transporter (auto-creates fake inbox)
let emailTransporter = null;
async function getTransporter() {
  if (emailTransporter) return emailTransporter;
  const testAccount = await nodemailer.createTestAccount();
  emailTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('📧 Ethereal email account ready:', testAccount.user);
  return emailTransporter;
}

const app = express();
app.use(cors());
app.use(express.json());

// Models
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Report = require('./models/Report');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/clinicsync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ Connected to MongoDB -> clinicsync database');

  // Auto-populate mock data for hackathon
  const medCount = await Medicine.countDocuments();
  if (medCount === 0) {
    const today = new Date();
    const past = new Date(today); past.setDate(today.getDate() - 10);
    const near = new Date(today); near.setDate(today.getDate() + 20);
    const future = new Date(today); future.setFullYear(today.getFullYear() + 1);

    const formatDate = (d) => d.toISOString().split('T')[0];

    await Medicine.insertMany([
      { name: 'Paracetamol 500mg', batchNo: 'B-101', expiryDate: formatDate(future), quantity: 500, minThreshold: 100 },
      { name: 'Amoxicillin 250mg', batchNo: 'B-102', expiryDate: formatDate(near), quantity: 50, minThreshold: 200 },
      { name: 'Ibuprofen 400mg', batchNo: 'B-103', expiryDate: formatDate(past), quantity: 20, minThreshold: 50 },
      { name: 'Cetirizine 10mg', batchNo: 'B-104', expiryDate: formatDate(future), quantity: 15, minThreshold: 30 }
    ]);
    console.log('✅ Auto-populated database with medicines');
  }

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({ fullName: 'Demo Staff', username: 'staff', password: 'password123', role: 'Pharmacist' });
    console.log('✅ Auto-populated default staff user (staff / password123)');
  }
}).catch(err => console.error('MongoDB connection error:', err));


// --- REST API ENDPOINTS --- //

// Auth API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.json({ success: true, username: user.username, fullName: user.fullName, role: user.role });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, fullName, role } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ success: false, message: 'Username exists' });

    await User.create({ username, email, password, fullName, role });
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send OTP endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with that email' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

    // Send via Ethereal
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"ClinicSync" <noreply@clinicsync.app>',
      to: email,
      subject: 'Your ClinicSync Password Reset OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:12px">
          <h2 style="color:#1a73e8">ClinicSync — Password Reset</h2>
          <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
          <p>Your One-Time Password (OTP) for resetting your password is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a73e8;text-align:center;padding:16px;background:#f0f6ff;border-radius:8px;margin:16px 0">${otp}</div>
          <p style="color:#888">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#aaa;font-size:12px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 OTP for ${email}: ${otp}`);
    console.log(`🔗 Preview email at: ${previewUrl}\n`);

    res.json({ success: true, previewUrl, message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Reset password (requires valid OTP)
app.post('/api/auth/reset', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with that email' });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested. Please click Send OTP first.' });
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    // OTP verified — update password
    delete otpStore[email];
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Inventory API
app.get('/api/inventory', async (req, res) => {
  try {
    const data = await Medicine.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const med = await Medicine.create(req.body);
    res.json({ success: true, data: med });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (deleted) {
      console.log(`🗑️ Deleted medicine: ${deleted.name} (${req.params.id})`);
      res.status(200).json({ success: true });
    } else {
      console.warn(`🛑 Delete failed: Medicine with ID ${req.params.id} not found.`);
      res.status(404).json({ success: false, message: 'Medicine not found' });
    }
  } catch (err) {
    console.error('❌ Error deleting medicine:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error during deletion' });
  }
});

// ── REPORT ENDPOINTS ───────────────────────────────────────────────────────

// Submit a new report
app.post('/api/reports', async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    res.status(201).json({ success: true, message: 'Report submitted to District Officer' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
});

// Get unread reports for DO
app.get('/api/reports/unread', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Mark report as read
app.patch('/api/reports/:id/read', async (req, res) => {
  try {
    await Report.findByIdAndUpdate(req.params.id, { status: 'viewed' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
