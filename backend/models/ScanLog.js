import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema(
  {
    gatekeeper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ticketNumber: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['APPROVED', 'REJECTED'],
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    scannedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const ScanLog = mongoose.model('ScanLog', scanLogSchema);

export default ScanLog;