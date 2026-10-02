import express from 'express';
import jwt from 'jsonwebtoken';
import Ticket from '../models/Ticket.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { protect, authorizeRole } from '../middleware/auth.js';
import ScanLog from '../models/ScanLog.js';

const router = express.Router();

// @desc    Validate QR Ticket (scan)
// @route   POST /api/gatekeeper/validate-ticket
// @access  Private (Gatekeeper / Admin)
router.post('/validate-ticket', protect, authorizeRole('gatekeeper', 'admin'), async (req, res, next) => {
  try {
    let { qrCodeData, eventId, ticketNumber, scanCode } = req.body;
    if (!qrCodeData && (ticketNumber || scanCode)) {
      const lookup = ticketNumber
        ? { ticketNumber: String(ticketNumber).trim() }
        : { scanCode: String(scanCode).trim().toUpperCase() };
      const ticketByReference = await Ticket.findOne(lookup).select('qrCodeData');
      if (ticketByReference) qrCodeData = ticketByReference.qrCodeData;
    }
    if (!qrCodeData) {
      return res.status(400).json({ success: false, message: 'QR Code payload is missing' });
    }

    let decoded;
    try {
      // 1. Verify signature of the ticket JWT
      decoded = jwt.verify(qrCodeData, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or tampered QR ticket signature' });
    }

    const { ticketId } = decoded;
    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'Invalid QR ticket metadata' });
    }

    // 2. Query ticket from database
    const ticket = await Ticket.findById(ticketId)
      .populate('event')
      .populate('category')
      .populate('buyer', 'name email profilePhoto')
      .populate('scannedBy', 'name');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket record not found in system database' });
    }

    const ticketClaimsMatch = (!decoded.ticketNumber || decoded.ticketNumber === ticket.ticketNumber)
      && (!decoded.serialNumber || decoded.serialNumber === ticket.ticketNumber)
      && (!decoded.scanCode || decoded.scanCode === ticket.scanCode)
      && (!decoded.attendeeName || decoded.attendeeName === (ticket.attendeeName || ticket.buyer.name));
    if (!ticketClaimsMatch) {
      return res.status(400).json({ success: false, message: 'Invalid or tampered QR ticket metadata' });
    }


    if (eventId && ticket.event._id.toString() !== eventId.toString()) {
      const message = 'This is not this event ticket.';
      return res.status(400).json({
        success: false,
        message,
        scannedTicket: {
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName || ticket.buyer.name,
          eventName: ticket.event.title
        }
      });
    }
    // 3. Verify booking status
    const booking = await Booking.findById(ticket.booking);
    if (!booking || booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'Entry Rejected: Associated booking is not finalized or has expired'
      });
    }

    // 4. Verify duplicate scan
    if (ticket.status === 'USED') {
      const scanDate = new Date(ticket.scannedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const gatekeeperName = ticket.scannedBy?.name || 'Unknown Gatekeeper';

      return res.status(400).json({
        success: false,
        duplicate: true,
        message: `DUPLICATE ENTRY REJECTED! Ticket was already scanned at ${scanDate} by gatekeeper: ${gatekeeperName}.`,
        ticketDetails: {
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName || ticket.buyer.name,
          buyerPhoto: ticket.buyer.profilePhoto || '',
          categoryName: ticket.category.name,
          eventName: ticket.event.title,
          scannedAt: ticket.scannedAt
        }
      });
    }

    // 5. Update ticket status to USED
    ticket.status = 'USED';
    ticket.scannedAt = new Date();
    ticket.scannedBy = req.user._id;
    await ticket.save();


    await ScanLog.create({
      gatekeeper: req.user._id,
      ticket: ticket._id,
      event: ticket.event._id,
      buyer: ticket.buyer._id,
      ticketNumber: ticket.ticketNumber,
      status: 'APPROVED',
      reason: 'Entry approved'
    });
    res.status(200).json({
      success: true,
      message: 'ACCESS APPROVED! Welcome to the venue.',
      ticketDetails: {
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName || ticket.buyer.name,
        buyerPhoto: ticket.buyer.profilePhoto || '',
        categoryName: ticket.category.name,
        eventName: ticket.event.title,
        seat: ticket.category.name // general category
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get scan history for current gatekeeper
// @route   GET /api/gatekeeper/scan-history
// @access  Private (Gatekeeper / Admin)
router.get('/scan-history', protect, authorizeRole('gatekeeper', 'admin'), async (req, res, next) => {
  try {
    const query = req.user.role === 'admin'
      ? { status: 'APPROVED' }
      : { gatekeeper: req.user._id, status: 'APPROVED' };
    const scans = await ScanLog.find(query)
      .populate('event', 'title venueName')
      .populate('buyer', 'name profilePhoto')
      .populate('gatekeeper', 'name')
      .sort({ scannedAt: -1 });


    res.status(200).json({ success: true, count: scans.length, scans });
  } catch (error) {
    next(error);
  }
});

export default router;
