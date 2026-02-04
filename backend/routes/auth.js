import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import User from '../models/User.js';

const router = express.Router();

// Cloudinary Config
// The SDK automatically configures itself if CLOUDINARY_URL is present in process.env
// Format: cloudinary://<api_key>:<api_secret>@<cloud_name>

// Multer Storage Configuration (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'travel_app_users',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      return res.status(400).json({ message: 'Username already exists' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'secretString', { expiresIn: '1h' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretString', { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// Google Login Route
router.post('/google-login', async (req, res) => {
  try {
    const { email, username, uid, picture } = req.body;
    
    // Check if user exists by firebase UID
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
        // Check if user exists by email (link accounts)
        user = await User.findOne({ email });
        
        if (user) {
            user.firebaseUid = uid;
            if (!user.picture) user.picture = picture;
            await user.save();
        } else {
            // Create new user
            // Ensure username is unique if possible, or appending random string
            // For now, standard creation
            user = await User.create({
                firebaseUid: uid,
                email: email,
                username: username || email.split('@')[0], // Fallback username
                picture: picture
            });
        }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretString', { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, picture: user.picture }
    });

  } catch (error) {
    console.error('Google Login error:', error);
    if (error.code === 11000) {
       // Duplicate key error (likely username collision)
       return res.status(400).json({ message: 'Username already taken, please sign up with a different username first.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});


// Phone Login Route (Mock Verification for Protoype)
router.post('/phone-login', async (req, res) => {
  try {
    const { phoneNumber, uid } = req.body;
    
    // WARN: In production, you must verify the Firebase ID Token using firebase-admin SDK
    // to prevent spoofing. For this prototype, we trust the client's UID.

    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
        // Try to find by phone number
        user = await User.findOne({ phoneNumber });
        
        if (user) {
            user.firebaseUid = uid;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                firebaseUid: uid,
                phoneNumber: phoneNumber,
                username: 'User' + phoneNumber.slice(-4) + Math.floor(Math.random() * 1000), 
            });
        }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretString', { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, phoneNumber: user.phoneNumber }
    });

  } catch (error) {
    console.error('Phone Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Current User Route
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretString');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update Profile Route
router.put('/update', upload.single('picture'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretString');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, email, phoneNumber, name } = req.body;

    // Check availability if changing unique fields
    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already taken' });
      user.email = email;
    }

    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (name) user.name = name;
    
    // Handle File Upload
    if (req.file) {
        // Cloudinary returns the absolute URL in path
        user.picture = req.file.path;
    }

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during update' });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your preferred service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
          `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
          `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}\n\n` +
          `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset email sent' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Error sending email' });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({ 
      resetPasswordToken: req.params.token, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save(); // Pre-save hook will hash the password

    res.status(200).json({ message: 'Password has been updated' });
  } catch (error) {
     console.error('Reset Password Error:', error);
     res.status(500).json({ message: 'Server error' });
  }
});

export default router;
