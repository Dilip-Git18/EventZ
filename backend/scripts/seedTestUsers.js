import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const testPassword = process.env.TEST_ACCOUNT_PASSWORD;

if (!testPassword) {
  console.error('TEST_ACCOUNT_PASSWORD is required to seed test users.');
  process.exitCode = 1;
} else {
  const testUsers = [
    {
      name: 'EventZ Test Buyer',
      email: 'test.buyer@eventz.in',
      role: 'buyer'
    },
    {
      name: 'EventZ Test Organizer',
      email: 'test.organizer@eventz.in',
      role: 'organizer'
    },
    {
      name: 'EventZ Test Gatekeeper',
      email: 'test.gatekeeper@eventz.in',
      role: 'gatekeeper'
    },
    {
      name: 'EventZ Test Admin',
      email: 'test.admin@eventz.in',
      role: 'admin'
    }
  ];

  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const testUser of testUsers) {
      const existingUser = await User.findOne({ email: testUser.email }).select('+password');

      if (existingUser) {
        existingUser.name = testUser.name;
        existingUser.role = testUser.role;
        existingUser.status = 'active';
        existingUser.password = testPassword;
        await existingUser.save();
        console.log(`Updated ${testUser.email}`);
      } else {
        await User.create({
          ...testUser,
          password: testPassword,
          status: 'active'
        });
        console.log(`Created ${testUser.email}`);
      }
    }
  } catch (error) {
    console.error(`Unable to seed test users: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
