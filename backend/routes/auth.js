import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Input Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['buyer', 'organizer', 'gatekeeper', 'admin']).default('buyer')
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required')
});

const profilePhotoDir = './uploads/profile-photos';
if (!fs.existsSync(profilePhotoDir)) {
  fs.mkdirSync(profilePhotoDir, { recursive: true });
}

const profilePhotoStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, profilePhotoDir);
  },
  filename(req, file, cb) {
    cb(null, `profile-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error('Profile photo must be a jpeg, jpg, png, or webp image'));
  }
});

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Please provide a valid email').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const userExists = await User.findOne({ email: validatedData.email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create(validatedData);
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Get user and explicitly select password
    const user = await User.findOne({ email: validatedData.email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    // Check password
    const isMatch = await user.matchPassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000), // Expiries in 5s
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });

  res.status(200).json({ success: true, message: 'Successfully logged out' });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      profilePhoto: req.user.profilePhoto || ''
    }
  });
});

// @desc    Upload current user's profile photo
// @route   POST /api/auth/profile/photo
// @access  Private
router.post('/profile/photo', protect, profilePhotoUpload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a profile photo' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.profilePhoto = `/uploads/profile-photos/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res, next) => {
  try {
    const validatedData = profileUpdateSchema.parse(req.body);
    const user = await User.findById(req.user._id);

    if (validatedData.name) user.name = validatedData.name;
    if (validatedData.email) {
      // Check if email already in use
      if (validatedData.email !== user.email) {
        const emailExists = await User.findOne({ email: validatedData.email });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        user.email = validatedData.email;
      }
    }
    if (validatedData.password) user.password = validatedData.password;

    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// Helper to sign JWT and set cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto || ''
      }
    });
};

export default router;
