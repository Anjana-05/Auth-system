import 'dotenv/config'; // Load env vars before anything else
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://user-auth-8f3d8.firebaseapp.com",
      "https://user-auth-8f3d8.web.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Explicit OPTION handling for preflight requests
app.options('*', cors());

app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/account_creation')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
