import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../model/User.js';

dotenv.config();

const ADMIN_EMAIL = 'admin@example.com'; // Replace with your admin email
const ADMIN_PASSWORD = 'admin123'; // Replace with a strong password

async function checkAndCreateAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB...');

    // Check if admin exists
    let admin = await User.findOne({ email: ADMIN_EMAIL });

    if (admin) {
      console.log('Admin user found:');
      console.log({
        email: admin.email,
        role: admin.role,
        isApproved: admin.isApproved,
        isActive: admin.isActive
      });

      // Update admin with correct role and approval if needed
      if (admin.role !== 'admin' || !admin.isApproved) {
        admin.role = 'admin';
        admin.isApproved = true;
        admin.isActive = true;
        await admin.save();
        console.log('Admin user updated with admin role and approval.');
      }
    } else {
      // Create admin user if not exists
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      admin = await User.create({
        fullname: 'Admin User',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isApproved: true,
        isActive: true,
        department: 'Administration'
      });

      console.log('New admin user created:', {
        email: admin.email,
        password: ADMIN_PASSWORD, // Only shown once for reference
        role: admin.role,
        isApproved: admin.isApproved
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// Run the function
checkAndCreateAdmin();
