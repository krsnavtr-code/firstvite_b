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
    console.log('Hashed password:', hashedPassword);
    
    // Test 2: Verify the hash
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log('Verification result:', isMatch);
    
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
    console.log('Connected to MongoDB');

    const email = 'krishna1avtar@gmail.com';
    const newPassword = 'KRSn@123';

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return;
    }

    // Update the password (the pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    
    console.log('Password has been reset successfully');
    
    // Verify the password
    const updatedUser = await User.findOne({ email });
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    console.log('Password verification:', isMatch);
    
    if (isMatch) {
      console.log('You can now log in with:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${newPassword}`);
    }
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the password reset
(async () => {
  console.log('Resetting password...');
  await resetUserPassword();
})();


