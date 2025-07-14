import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../model/User.js';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const DB = process.env.MongoDBURI.replace(
      '<PASSWORD>',
      process.env.MongoDB_PASSWORD
    );

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('DB connection successful!');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@lms.com' });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      fullname: 'Admin User',
      email: 'admin@lms.com',
      password: hashedPassword,
      role: 'admin',
      department: 'Administration',
      phone: '1234567890',
      isApproved: true, // Auto-approve the admin user
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@lms.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the function
createAdminUser();
