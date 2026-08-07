import express from 'express';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import { protect, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Restrict all routes to admin
router.use(protect, authorizeRole('admin'));

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle block/unblock user
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Admins cannot block themselves' });
    }

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${user.status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    List all events (drafts, published, cancelled)
// @route   GET /api/admin/events
// @access  Private (Admin)
router.get('/events', async (req, res, next) => {
  try {
    const events = await Event.find({})
      .populate('organizer', 'name email')
      .sort({ startDate: 1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel an event (admin action)
// @route   PUT /api/admin/events/:id/cancel
// @access  Private (Admin)
router.put('/events/:id/cancel', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    event.status = 'cancelled';
    await event.save();

    res.status(200).json({ success: true, message: 'Event cancelled successfully', event });
  } catch (error) {
    next(error);
  }
});

// @desc    Get global platform system-wide statistics
// @route   GET /api/admin/system-stats
// @access  Private (Admin)
router.get('/system-stats', async (req, res, next) => {
  try {
    const [usersCount, eventsCount, bookingsStats] = await Promise.all([
      // Count total accounts grouped by role
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $count: {} }
          }
        }
      ]),
      // Count total events
      Event.countDocuments({}),
      // Sum revenue and ticket quantity from confirmed bookings
      Booking.aggregate([
        {
          $match: { status: 'CONFIRMED' }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' },
            bookingsCount: { $count: {} }
          }
        }
      ])
    ]);

    const stats = {
      users: {
        total: usersCount.reduce((sum, item) => sum + item.count, 0),
        buyer: usersCount.find((u) => u._id === 'buyer')?.count || 0,
        organizer: usersCount.find((u) => u._id === 'organizer')?.count || 0,
        gatekeeper: usersCount.find((u) => u._id === 'gatekeeper')?.count || 0,
        admin: usersCount.find((u) => u._id === 'admin')?.count || 0
      },
      events: eventsCount,
      bookings: {
        count: bookingsStats[0]?.bookingsCount || 0,
        ticketsSold: bookingsStats[0]?.ticketsSold || 0,
        revenue: bookingsStats[0]?.totalRevenue || 0
      }
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

export default router;
