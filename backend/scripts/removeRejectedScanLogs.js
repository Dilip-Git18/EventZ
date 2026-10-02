import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ScanLog from '../models/ScanLog.js';

dotenv.config();

try {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await ScanLog.deleteMany({ status: 'REJECTED' });
  console.log(`Removed ${result.deletedCount} rejected scan log(s).`);
} finally {
  await mongoose.disconnect();
}
