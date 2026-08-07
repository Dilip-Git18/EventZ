import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import TicketCategory from '../models/TicketCategory.js';
import Booking from '../models/Booking.js';
import { protect, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png, webp)!'));
    }
  }
});

// Zod validation schemas
const eventCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  bannerUrl: z.string().min(1, 'Please provide a valid banner image URL or upload one').refine((value) => {
    if (value.startsWith('/uploads/')) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'Please provide a valid banner image URL or upload one'),
  venueName: z.string().min(2, 'Venue name is required'),
  venueAddress: z.string().min(5, 'Venue address is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str))
});

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  price: z.number().min(0, 'Price cannot be negative'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1')
});

// @desc    Get all published events (with search & filters)
// @route   GET /api/events
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { search, date } = req.query;
    let query = { status: 'published' };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { venueName: { $regex: search, $options: 'i' } }
      ];
    }

    // Date filter (events starting on or after specific date)
    if (date) {
      query.startDate = { $gte: new Date(date) };
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ startDate: 1 });

    // Include ticket categories for each event
    const eventsWithCategories = await Promise.all(
      events.map(async (event) => {
        const categories = await TicketCategory.find({ event: event._id });
        return {
          ...event.toObject(),
          categories
        };
      })
    );

    res.status(200).json({ success: true, count: events.length, events: eventsWithCategories });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single event details
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.id || req.params.id).populate('organizer', 'name email');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const categories = await TicketCategory.find({ event: event._id });

    // Calculate real-time tickets remaining (capacity - confirmed/pending)
    const categoriesWithRemaining = await Promise.all(
      categories.map(async (cat) => {
        const activeBookings = await Booking.aggregate([
          {
            $match: {
              category: cat._id,
              $or: [
                { status: 'CONFIRMED' },
                { status: 'PENDING', expiresAt: { $gt: new Date() } }
              ]
            }
          },
          {
            $group: {
              _id: null,
              totalReserved: { $sum: '$quantity' }
            }
          }
        ]);

        const reserved = activeBookings.length > 0 ? activeBookings[0].totalReserved : 0;
        return {
          ...cat.toObject(),
          remaining: Math.max(0, cat.capacity - reserved)
        };
      })
    );

    res.status(200).json({
      success: true,
      event: {
        ...event.toObject(),
        categories: categoriesWithRemaining
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload event banner
// @route   POST /api/events/upload-banner
// @access  Private (Organizer/Admin)
router.post(
  '/upload-banner',
  protect,
  authorizeRole('organizer', 'admin'),
  upload.single('banner'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    const bannerUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, bannerUrl });
  }
);

// @desc    Create an event
// @route   POST /api/events
// @access  Private (Organizer)
router.post('/', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    const validatedData = eventCreateSchema.parse(req.body);

    if (validatedData.endDate < validatedData.startDate) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    const event = await Event.create({
      ...validatedData,
      organizer: req.user._id
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Organizer)
router.put('/:id', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
    }

    const validatedData = eventCreateSchema.partial().parse(req.body);
    
    // Check date logic if dates are updated
    const start = validatedData.startDate || event.startDate;
    const end = validatedData.endDate || event.endDate;
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    event = await Event.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Organizer)
router.delete('/:id', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
    }

    // Cascade delete categories
    await TicketCategory.deleteMany({ event: event._id });
    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Event and associated ticket categories deleted' });
  } catch (error) {
    next(error);
  }
});

// @desc    Add ticket category to event
// @route   POST /api/events/:id/categories
// @access  Private (Organizer)
router.post('/:id/categories', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to add ticket categories to this event' });
    }

    const validatedData = categorySchema.parse(req.body);

    const category = await TicketCategory.create({
      ...validatedData,
      event: event._id
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
});

export default router;
