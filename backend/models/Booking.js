import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    quantity: {
      type: Number,
      required: [true, 'Please add a quantity'],
      min: [1, 'Quantity must be at least 1']
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    paymentId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Add an index to help cron clean up expired pending bookings
bookingSchema.index({ status: 1, expiresAt: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
