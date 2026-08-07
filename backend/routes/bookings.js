import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import TicketCategory from '../models/TicketCategory.js';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js'; // Wait, let's make sure it imports Ticket.js
import { protect, authorizeRole } from '../middleware/auth.js';
import { acquireLock, releaseLock } from '../services/lockService.js';

const router = express.Router();

// Input Schemas
const reserveSchema = z.object({
  categoryId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid Category ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10, 'Cannot reserve more than 10 tickets at once')
});

const paySchema = z.object({
  paymentDetails: z.object({
    cardName: z.string().min(2, 'Name on card is required').optional(),
    cardNumber: z.string().min(12, 'Card number is invalid').optional()
  }).optional()
});

// @desc    Reserve tickets (High Concurrency Redlock-protected)
// @route   POST /api/bookings/reserve
// @access  Private (Buyer)
router.post('/reserve', protect, authorizeRole('buyer'), async (req, res, next) => {
  let lockToken = null;
  const lockKey = `lock:category:${req.body.categoryId}`;

  try {
    const validatedData = reserveSchema.parse(req.body);
    const { categoryId, quantity } = validatedData;

    // 1. Acquire Redis Lock (ttl: 5000ms, retry up to 10 attempts)
    lockToken = await acquireLock(lockKey, 5000, 10);
    if (!lockToken) {
      return res.status(429).json({
        success: false,
        message: 'Engine is busy processing reservations. Please try again in a few seconds.'
      });
    }

    // 2. Query ticket category capacity
    const category = await TicketCategory.findById(categoryId);
    if (!category) {
      await releaseLock(lockKey, lockToken);
      return res.status(404).json({ success: false, message: 'Ticket category not found' });
    }

    // 3. Query parent event status
    const event = await Event.findById(category.event);
    if (!event || event.status === 'cancelled') {
      await releaseLock(lockKey, lockToken);
      return res.status(400).json({ success: false, message: 'This event is no longer active' });
    }

    // 4. Calculate total tickets already allocated (CONFIRMED or PENDING and not expired)
    const activeBookings = await Booking.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
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

    const totalReserved = activeBookings.length > 0 ? activeBookings[0].totalReserved : 0;
    const remaining = category.capacity - totalReserved;

    if (totalReserved + quantity > category.capacity) {
      await releaseLock(lockKey, lockToken);
      return res.status(400).json({
        success: false,
        message: `Not enough tickets available. Requested: ${quantity}, Remaining: ${Math.max(0, remaining)}`
      });
    }

    // 5. Create PENDING Booking reservation document (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
    const totalAmount = category.price * quantity;

    const booking = await Booking.create({
      buyer: req.user._id,
      event: event._id,
      category: category._id,
      quantity,
      totalAmount,
      status: 'PENDING',
      expiresAt
    });

    // 6. Release Redis lock
    await releaseLock(lockKey, lockToken);
    lockToken = null;

    res.status(201).json({
      success: true,
      message: 'Tickets reserved successfully for 5 minutes',
      booking
    });
  } catch (error) {
    // Make sure we release the lock if an error occurs inside the critical section
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
    next(error);
  }
});

// @desc    Complete booking payment and generate tickets
// @route   POST /api/bookings/:id/pay
// @access  Private (Buyer)
router.post('/:id/pay', protect, authorizeRole('buyer'), async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    // Check ownership
    if (booking.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to checkout this reservation' });
    }

    // Validate current reservation status
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Reservation is no longer pending (Current: ${booking.status})` });
    }

    if (booking.expiresAt < new Date()) {
      booking.status = 'EXPIRED';
      await booking.save();
      return res.status(400).json({ success: false, message: 'Reservation has expired. Please select tickets again.' });
    }

    // Parse mock payment details
    paySchema.parse(req.body);

    // Simulate successful transaction
    const paymentId = `TXN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    booking.status = 'CONFIRMED';
    booking.paymentId = paymentId;
    await booking.save();

    // Generate Tickets with signed JWT QR codes
    const tickets = [];
    for (let i = 0; i < booking.quantity; i++) {
      const ticketId = new mongoose.Types.ObjectId();
      const ticketNumber = `EZ-${crypto.randomUUID().substring(0, 4).toUpperCase()}-${crypto.randomUUID().substring(0, 4).toUpperCase()}`;

      // Sign JWT payload for the QR code
      const qrCodeData = jwt.sign(
        {
          ticketId: ticketId.toString(),
          bookingId: booking._id.toString(),
          eventId: booking.event.toString(),
          buyerId: req.user._id.toString(),
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET
      );

      const ticket = await Ticket.create({
        _id: ticketId,
        booking: booking._id,
        event: booking.event,
        category: booking.category,
        buyer: req.user._id,
        ticketNumber,
        status: 'BOOKED',
        qrCodeData
      });

      tickets.push(ticket);
    }

    res.status(200).json({
      success: true,
      message: 'Booking finalized and payment successful',
      booking,
      tickets
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get current user's booking history
// @route   GET /api/bookings/my-bookings
// @access  Private (Buyer)
router.get('/my-bookings', protect, authorizeRole('buyer'), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ buyer: req.user._id })
      .populate('event')
      .populate('category')
      .sort({ createdAt: -1 });

    const bookingsWithTickets = await Promise.all(
      bookings.map(async (booking) => {
        let tickets = [];
        if (booking.status === 'CONFIRMED') {
          tickets = await Ticket.find({ booking: booking._id });
        }
        return {
          ...booking.toObject(),
          tickets
        };
      })
    );

    res.status(200).json({ success: true, count: bookings.length, bookings: bookingsWithTickets });
  } catch (error) {
    next(error);
  }
});

// @desc    Get booking details by ID
// @route   GET /api/bookings/:id
// @access  Private (Buyer, Organizer, Admin)
router.get('/:id', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('category')
      .populate('buyer', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Role verification
    const isBuyerOwner = booking.buyer._id.toString() === req.user._id.toString();
    
    // Check if organizer owns the event
    let isOrganizerOwner = false;
    if (req.user.role === 'organizer') {
      const event = await Event.findById(booking.event);
      isOrganizerOwner = event && event.organizer.toString() === req.user._id.toString();
    }

    const isAdmin = req.user.role === 'admin';

    if (!isBuyerOwner && !isOrganizerOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    let tickets = [];
    if (booking.status === 'CONFIRMED') {
      tickets = await Ticket.find({ booking: booking._id });
    }

    res.status(200).json({
      success: true,
      booking: {
        ...booking.toObject(),
        tickets
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
