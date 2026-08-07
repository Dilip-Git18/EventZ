import express from 'express';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import Ticket from '../models/Ticket.js';
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all confirmed tickets for current buyer
// @route   GET /api/tickets/my-tickets
// @access  Private (Buyer)
router.get('/my-tickets', protect, async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ buyer: req.user._id })
      .populate('event')
      .populate('category')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
});

// @desc    Download professional PDF ticket
// @route   GET /api/tickets/:id/pdf
// @access  Private (Buyer owner, Gatekeeper, Organizer, Admin)
router.get('/:id/pdf', protect, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event')
      .populate('category')
      .populate('buyer', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role and ownership check
    const isBuyerOwner = ticket.buyer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isGatekeeper = req.user.role === 'gatekeeper';

    let isOrganizerOwner = false;
    if (req.user.role === 'organizer') {
      const event = await Event.findById(ticket.event);
      isOrganizerOwner = event && event.organizer.toString() === req.user._id.toString();
    }

    if (!isBuyerOwner && !isAdmin && !isGatekeeper && !isOrganizerOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this ticket' });
    }

    // Fetch the organizer's name
    const eventOrganizer = await Event.findById(ticket.event).populate('organizer', 'name');
    const organizerName = eventOrganizer?.organizer?.name || 'EventZ Partner';

    // Generate QR code as a PNG buffer
    const qrBuffer = await QRCode.toBuffer(ticket.qrCodeData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 150
    });

    // Create the PDF document in landscape (ticket stub style)
    const doc = new PDFDocument({
      size: [600, 260],
      margins: { top: 15, bottom: 15, left: 15, right: 15 }
    });

    // Pipe PDF to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=EventZ-${ticket.ticketNumber}.pdf`);
    doc.pipe(res);

    // --- DRAW TICKET DESIGN ---

    // Dark Card Background
    doc.rect(10, 10, 580, 240).fill('#111317');

    // Accent left border
    doc.rect(10, 10, 8, 240).fill('#7C3AED'); // Purple theme color

    // Draw Event Banner (if local banner exists)
    let bannerLoaded = false;
    if (ticket.event.bannerUrl && ticket.event.bannerUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), ticket.event.bannerUrl);
      if (fs.existsSync(localPath)) {
        try {
          doc.image(localPath, 18, 10, { width: 140, height: 240 });
          bannerLoaded = true;
        } catch (err) {
          console.error('Error drawing image on PDF:', err.message);
        }
      }
    }

    // If banner failed to load, draw a decorative colored box
    if (!bannerLoaded) {
      doc.rect(18, 10, 140, 240).fill('#1E212A');
      doc.fillColor('#7C3AED').fontSize(14).text('EventZ', 50, 100, { width: 100 });
      doc.fillColor('#9CA3AF').fontSize(8).text('Live Experience', 45, 120, { width: 100 });
    }

    // Divider Line (Tear-off stub indicator)
    doc.moveTo(420, 10).lineTo(420, 250).dash(5, { space: 5 }).stroke('#2D313E');

    // Restores solid lines
    doc.undash();

    // --- MAIN SECTION TEXT (x: 175 to 400) ---
    const mainX = 175;

    // Event Title
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text(ticket.event.title, mainX, 25, { width: 230, ellipsis: true });

    // Organizer Name
    doc.fillColor('#9CA3AF')
       .font('Helvetica')
       .fontSize(9)
       .text(`Organized by: ${organizerName}`, mainX, doc.y + 4);

    // Separator line
    doc.moveTo(mainX, doc.y + 8).lineTo(405, doc.y + 8).stroke('#2D313E');

    // Date & Time
    const startDate = new Date(ticket.event.startDate);
    const dateString = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeString = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('DATE & TIME', mainX, doc.y + 14);

    doc.fillColor('#E5E7EB')
       .font('Helvetica')
       .fontSize(9)
       .text(`${dateString} @ ${timeString}`, mainX, doc.y + 3);

    // Venue Info
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('VENUE', mainX, doc.y + 10);

    doc.fillColor('#E5E7EB')
       .font('Helvetica')
       .fontSize(9)
       .text(`${ticket.event.venueName}`, mainX, doc.y + 3, { width: 230, ellipsis: true });

    // Ticket category
    doc.rect(mainX, doc.y + 12, 100, 20).fill('#7C3AED');
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(ticket.category.name.toUpperCase(), mainX, doc.y + 18, { width: 100, align: 'center' });

    // Footer Serial Info
    doc.fillColor('#4B5563')
       .font('Helvetica')
       .fontSize(7)
       .text(`Ticket ID: ${ticket.ticketNumber}`, mainX, 230);

    doc.text(`Booking: ${ticket.booking.toString().substring(0, 10)}...`, mainX + 130, 230);

    // --- STUB SECTION TEXT (x: 430 to 580) ---
    const stubX = 435;

    // Stub Title
    doc.fillColor('#7C3AED')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('TICKET STUB', stubX, 25);

    // Buyer Name
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(ticket.buyer.name, stubX, 40, { width: 140, ellipsis: true });

    doc.fillColor('#9CA3AF')
       .font('Helvetica')
       .fontSize(8)
       .text(ticket.category.name, stubX, doc.y + 2);

    // QR Code Placement
    doc.image(qrBuffer, stubX, doc.y + 10, { width: 120, height: 120 });

    // Terms
    doc.fillColor('#4B5563')
       .font('Helvetica')
       .fontSize(6)
       .text('VALID FOR ONE ENTRY. DO NOT DUPLICATE.', stubX - 5, 230, { width: 150, align: 'center' });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    next(error);
  }
});

export default router;
