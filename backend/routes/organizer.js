import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import TicketCategory from '../models/TicketCategory.js';
import Ticket from '../models/Ticket.js';
import RejectedScanReport from '../models/RejectedScanReport.js';
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
        ,
        categories: eventCategories.map((category) => ({
          _id: category._id,
          name: category.name,
          price: category.price,
          capacity: category.capacity
        }))
      };
    });

    res.status(200).json({ success: true, count: eventsWithSummary.length, events: eventsWithSummary });
  } catch (error) {
    next(error);
  }
});

// @desc    Get issued ticket holders for an organizer-owned event
// @route   GET /api/organizer/events/:eventId/tickets
// @access  Private (Organizer)
router.get('/events/:eventId/tickets', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id })
      .select('title')
      .lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const [tickets, rejectedScanReport] = await Promise.all([
      Ticket.find({ event: event._id })
        .select('ticketNumber attendeeName category buyer status scannedAt scannedBy')
        .populate('category', 'name')
        .populate('buyer', 'name email profilePhoto')
        .populate('scannedBy', 'name')
        .sort({ ticketNumber: 1 })
        .lean(),
      RejectedScanReport.findOne({ event: event._id })
        .select('rejectedTickets importedAt')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      event: { _id: event._id, title: event.title },
      rejectedScanReport: rejectedScanReport
        ? {
            rejectedTickets: rejectedScanReport.rejectedTickets,
            importedAt: rejectedScanReport.importedAt
          }
        : null,
      tickets: tickets.map((ticket) => ({
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName || ticket.buyer?.name || 'Unknown attendee',
        buyerName: ticket.buyer?.name || 'Unknown buyer',
        buyerEmail: ticket.buyer?.email || '',
        buyerPhoto: ticket.buyer?.profilePhoto || '',
        categoryName: ticket.category?.name || 'Uncategorized',
        status: ticket.status,
        scannedAt: ticket.scannedAt || null,
        scannedByName: ticket.scannedBy?.name || ''
      }))
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Save the latest rejected scan ticket counts for an organizer-owned event
// @route   PUT /api/organizer/events/:eventId/rejected-scans
// @access  Private (Organizer)
router.put('/events/:eventId/rejected-scans', protect, authorizeRole('organizer'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id })
      .select('_id')
      .lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const input = req.body?.rejectedTickets;
    if (!Array.isArray(input) || input.length > 1000) {
      return res.status(400).json({ success: false, message: 'Rejected tickets must be an array of up to 1,000 entries' });
    }

    const rejectedTickets = [];
    const ticketNumbers = new Set();
    for (const item of input) {
      const ticketNumber = typeof item?.ticketNumber === 'string'
        ? item.ticketNumber.trim().toUpperCase()
        : '';
      const rejectionCount = item?.rejectionCount;
      if (
        !ticketNumber
        || ticketNumber.length > 100
        || !Number.isSafeInteger(rejectionCount)
        || rejectionCount < 1
        || ticketNumbers.has(ticketNumber)
      ) {
        return res.status(400).json({ success: false, message: 'Each rejected ticket needs a unique ticket number and a positive whole-number rejection count' });
      }
      ticketNumbers.add(ticketNumber);
      rejectedTickets.push({ ticketNumber, rejectionCount });
    }

    const importedAt = new Date();
    const report = await RejectedScanReport.findOneAndUpdate(
      { event: event._id },
      {
        $set: {
          uploadedBy: req.user._id,
          rejectedTickets,
          importedAt
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('rejectedTickets importedAt');

    res.status(200).json({
      success: true,
      rejectedScanReport: {
        rejectedTickets: report.rejectedTickets,
        importedAt: report.importedAt
      }
    });
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
