require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

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
app.use(cors({
  origin: '*', // For production, replace with specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); 
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Models
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Report = require('./models/Report');

// --- Middleware: Verify JWT --- //
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinicsync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ Connected to MongoDB');

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
    // Note: The pre-save hook in User model will hash this password
    await User.create({ fullName: 'Demo Staff', username: 'staff', email: 'staff@example.com', password: 'password123', role: 'Pharmacist' });
    console.log('✅ Auto-populated default staff user (staff@example.com / password123)');
  }
}).catch(err => console.error('MongoDB connection error:', err));


// --- REST API ENDPOINTS --- //

// Auth API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token, 
      username: user.username, 
      fullName: user.fullName, 
      role: user.role,
      email: user.email,
      profilePic: user.profilePic
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, fullName, role } = req.body;
  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = await User.create({ username, email, password, fullName, role });
    
    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, username: user.username, profilePic: user.profilePic });
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; 

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
    res.json({ success: true, previewUrl, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

app.post('/api/auth/reset', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with that email' });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested.' });
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }
    if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect OTP.' });

    delete otpStore[email];
    user.password = newPassword; // Model hook will hash this
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- PROTECTED ROUTES --- //

// Inventory API
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const data = await Medicine.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const med = await Medicine.create(req.body);
    res.json({ success: true, data: med });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  // Use role from the verified token
  if (req.user.role !== 'District Officer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Only District Officers can delete inventory items.' 
    });
  }

  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (deleted) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Medicine not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during deletion' });
  }
});

// Report ENDPOINTS
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    res.status(201).json({ success: true, message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
});

app.get('/api/reports/unread', authenticateToken, async (req, res) => {
  if (req.user.role !== 'District Officer') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  try {
    const reports = await Report.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.patch('/api/reports/:id/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'District Officer') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  try {
    await Report.findByIdAndUpdate(req.params.id, { status: 'viewed' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Profile ENDPOINTS
app.get('/api/auth/profile/:email', authenticateToken, async (req, res) => {
  // Ensure user can only access their own profile (unless admin/DO)
  if (req.user.email !== req.params.email && req.user.role !== 'District Officer') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ 
      success: true, 
      data: { fullName: user.fullName, email: user.email, role: user.role, username: user.username, profilePic: user.profilePic } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/auth/profile/:email', authenticateToken, async (req, res) => {
  if (req.user.email !== req.params.email && req.user.role !== 'District Officer') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const { fullName, email, role, profilePic } = req.body;
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
      user.email = email;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (profilePic !== undefined) user.profilePic = profilePic;
    if (role !== undefined && req.user.role === 'District Officer') user.role = role; // Only DO can change roles

    await user.save();
    res.json({ success: true, message: 'Profile updated', data: { fullName: user.fullName, email: user.email, role: user.role, profilePic: user.profilePic } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
