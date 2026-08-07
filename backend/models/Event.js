import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    bannerUrl: {
      type: String,
      required: [true, 'Please add a banner image URL or upload one']
    },
    venueName: {
      type: String,
      required: [true, 'Please add a venue name']
    },
    venueAddress: {
      type: String,
      required: [true, 'Please add a venue address']
    },
    startDate: {
      type: Date,
      required: [true, 'Please add a start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please add an end date']
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'published'
    }
  },
  {
    timestamps: true
  }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
