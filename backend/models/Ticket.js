import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketCategory',
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['BOOKED', 'USED'],
      default: 'BOOKED'
    },
    qrCodeData: {
      type: String,
      required: true
    },
    scannedAt: {
      type: Date
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
