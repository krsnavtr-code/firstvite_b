import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../model/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const setupAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MongoDBURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Check if admin already exists
        const adminExists = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
        
        if (adminExists) {
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, salt);

        const admin = new User({
            fullname: 'Admin User',
            email: process.env.DEFAULT_ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        await admin.save();
        
    } catch (error) {
        console.error('Error setting up admin user:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

setupAdmin();
