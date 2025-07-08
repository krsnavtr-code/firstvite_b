import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MongoDBURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const email = 'krishnaavtar1211@gmail.com';
        const newPassword = 'KRSn@1234'; // The password you want to set

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        const result = await User.updateOne(
            { email },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            console.log('User not found');
        } else {
            console.log('Password updated successfully');
        }
    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        // Close the connection
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

updatePassword();
