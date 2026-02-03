import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();

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
  
    // Check if user has password (local auth) or only google auth
    if (!user.password && user.googleId) {
        // This case shouldn't happen if we auto-gen passwords, but just in case
       return res.status(400).json({ message: 'Please login with Google' });
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

// Combined Google Auth Route (Initiation and Callback)
router.get('/google', (req, res, next) => {
  if (req.query.code) {
    // This is the callback from Google
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('Google Auth Error:', err);
        return res.redirect('http://localhost:3000/login?error=server_error');
      }
      if (!user) {
        console.error('Google Auth Failed: No user');
        return res.redirect('http://localhost:3000/login?error=auth_failed');
      }
      
      // Successful authentication
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretString', { expiresIn: '1h' });
      res.redirect(`http://localhost:3000/login-success?token=${token}`);
    })(req, res, next);
  } else {
    // This is the login initiation
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
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
          `http://localhost:3000/reset-password/${token}\n\n` +
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
