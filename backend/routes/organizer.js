import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import TicketCategory from '../models/TicketCategory.js';
import Ticket from '../models/Ticket.js';
import { protect, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get organizer metrics dashboard (using Promise.all parallel aggregations)
// @route   GET /api/organizer/dashboard-analytics
// @access  Private (Organizer)
router.get('/dashboard-analytics', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    // 1. Fetch organizer's events
    const events = await Event.find({ organizer: req.user._id });
    if (events.length === 0) {
      return res.status(200).json({
        success: true,
        summary: { totalRevenue: 0, totalTicketsSold: 0, bookingsCount: 0, attendanceRate: 0 },
        categories: [],
        trends: [],
        eventsCount: 0
      });
    }

    const eventIds = events.map((e) => e._id);

    // 2. Parallel calculations using Promise.all
    const [revenueAndTickets, attendanceStats, categorySales, salesTrends] = await Promise.all([
      // Aggregation A: Total bookings count, revenue, and total quantity of tickets sold
      Booking.aggregate([
        {
          $match: {
            event: { $in: eventIds },
            status: 'CONFIRMED'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalTicketsSold: { $sum: '$quantity' },
            bookingsCount: { $count: {} }
          }
        }
      ]),

      // Aggregation B: Attendance stats (Tickets USED vs BOOKED)
      Ticket.aggregate([
        {
          $match: {
            event: { $in: eventIds }
          }
        },
        {
          $group: {
            _id: null,
            totalIssued: { $count: {} },
            totalUsed: {
              $sum: { $cond: [{ $eq: ['$status', 'USED'] }, 1, 0] }
            }
          }
        }
      ]),

      // Aggregation C: Sales by Ticket Category
      Booking.aggregate([
        {
          $match: {
            event: { $in: eventIds },
            status: 'CONFIRMED'
          }
        },
        {
          $group: {
            _id: '$category',
            sold: { $sum: '$quantity' },
            revenue: { $sum: '$totalAmount' }
          }
        }
      ]),

      // Aggregation D: Daily Sales Trends (for the last 14 days)
      Booking.aggregate([
        {
          $match: {
            event: { $in: eventIds },
            status: 'CONFIRMED',
            createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format aggregate outputs
    const summary = {
      totalRevenue: revenueAndTickets[0]?.totalRevenue || 0,
      totalTicketsSold: revenueAndTickets[0]?.totalTicketsSold || 0,
      bookingsCount: revenueAndTickets[0]?.bookingsCount || 0,
      attendanceRate: attendanceStats[0]?.totalIssued > 0
        ? Math.round((attendanceStats[0].totalUsed / attendanceStats[0].totalIssued) * 100)
        : 0,
      totalCheckedIn: attendanceStats[0]?.totalUsed || 0
    };

    // Load actual category details to merge with sales data
    const categoriesList = await TicketCategory.find({ event: { $in: eventIds } }).populate('event', 'title');
    const categoriesDetails = categoriesList.map((cat) => {
      const sale = categorySales.find((s) => s._id.toString() === cat._id.toString());
      const soldCount = sale?.sold || 0;
      return {
        id: cat._id,
        name: cat.name,
        eventTitle: cat.event.title,
        price: cat.price,
        capacity: cat.capacity,
        sold: soldCount,
        remaining: Math.max(0, cat.capacity - soldCount),
        revenue: sale?.revenue || 0
      };
    });

    res.status(200).json({
      success: true,
      summary,
      categories: categoriesDetails,
      trends: salesTrends,
      eventsCount: events.length
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get organizer's created events
// @route   GET /api/organizer/events
// @access  Private (Organizer)
router.get('/events', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (events.length === 0) {
      return res.status(200).json({ success: true, count: 0, events: [] });
    }

    const eventIds = events.map((event) => event._id);
    const categories = await TicketCategory.find({ event: { $in: eventIds } }).lean();

    const categoriesByEvent = categories.reduce((accumulator, category) => {
      const eventId = category.event.toString();
      if (!accumulator[eventId]) {
        accumulator[eventId] = [];
      }

      accumulator[eventId].push(category);
      return accumulator;
    }, {});

    const eventsWithSummary = events.map((event) => {
      const eventCategories = categoriesByEvent[event._id.toString()] || [];
      return {
        ...event,
        categoriesCount: eventCategories.length,
        hasTicketsConfigured: eventCategories.length > 0
      };
    });

    res.status(200).json({ success: true, count: eventsWithSummary.length, events: eventsWithSummary });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all bookings for organizer's events
// @route   GET /api/organizer/bookings
// @access  Private (Organizer)
router.get('/bookings', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id });
    if (events.length === 0) {
      return res.status(200).json({ success: true, count: 0, bookings: [] });
    }

    const eventIds = events.map((e) => e._id);
    const bookings = await Booking.find({ event: { $in: eventIds } })
      .populate('event', 'title startDate venueName')
      .populate('category', 'name price')
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
});

export default router;
