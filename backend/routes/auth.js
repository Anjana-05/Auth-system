import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
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

export default router;
