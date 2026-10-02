import mongoose from 'mongoose';

const rejectedScanReportSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rejectedTickets: [{
      ticketNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 100
      },
      rejectionCount: {
        type: Number,
        required: true,
        min: 1,
        validate: Number.isInteger
      }
    }],
    importedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  { timestamps: true }
);

const RejectedScanReport = mongoose.model('RejectedScanReport', rejectedScanReportSchema);

export default RejectedScanReport;
