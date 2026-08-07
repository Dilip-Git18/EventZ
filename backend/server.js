import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import Booking from './models/Booking.js';

// Route imports
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import bookingRoutes from './routes/bookings.js';
import ticketRoutes from './routes/tickets.js';
import gatekeeperRoutes from './routes/gatekeeper.js';
import organizerRoutes from './routes/organizer.js';
import adminRoutes from './routes/admin.js';

// Load env vars
dotenv.config();

// Connect to MongoDB database
connectDB();

const app = express();

// Security Middlewares
// Disable contentSecurityPolicy in helmet for development to ease loading local images
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Enable CORS
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS Policy restriction'), false);
    },
    credentials: true
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload folders (banner images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate Limiting (Prevent spamming / DDoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EventZ Engine API is fully operational',
    timestamp: new Date()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/gatekeeper', gatekeeperRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);

// Background Cron: Auto-expire pending reservations after 5 minutes
// Runs every 15 seconds to ensure highly accurate countdown timers
setInterval(async () => {
  try {
    const now = new Date();
    const result = await Booking.updateMany(
      { status: 'PENDING', expiresAt: { $lt: now } },
      { status: 'EXPIRED' }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Cron] Auto-expired ${result.modifiedCount} stale pending ticket reservations.`);
    }
  } catch (error) {
    console.error('[Cron] Error clearing expired bookings:', error.message);
  }
}, 15000);

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`EventZ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
