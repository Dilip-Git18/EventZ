import mongoose from 'mongoose';

const ticketCategorySchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Please add a category name (e.g. VIP, General Admission)'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Please add a ticket price'],
      min: [0, 'Price cannot be negative']
    },
    capacity: {
      type: Number,
      required: [true, 'Please add a capacity'],
      min: [1, 'Capacity must be at least 1']
    }
  },
  {
    timestamps: true
  }
);

const TicketCategory = mongoose.model('TicketCategory', ticketCategorySchema);

export default TicketCategory;
