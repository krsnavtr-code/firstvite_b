import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../model/User.js';

dotenv.config();

const testPasswordHashing = async () => {
  try {
    const testPassword = 'KRSn@123';
    
    // Test 1: Hash the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Test 2: Verify the hash
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    
    return isMatch;
  } catch (error) {
    console.error('Error in testPasswordHashing:', error);
    return false;
  }
};

const resetUserPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MongoDBURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = 'krishna1avtar@gmail.com';
    const newPassword = 'KRSn@123';

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return;
    }

    // Update the password (the pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    
    // Verify the password
    const updatedUser = await User.findOne({ email });
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the password reset
(async () => {
  await resetUserPassword();
})();


