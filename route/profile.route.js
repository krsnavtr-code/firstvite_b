import express from 'express';
import User from '../model/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   PUT /api/profile
// @desc    Update user profile (phone and address only)
// @access  Private (any authenticated user)
router.put('/', protect, async (req, res) => {
  try {
    console.log('Profile update request from user:', req.user._id);
    
    const { phone, address, ...otherData } = req.body;
    
    // Only allow updating specific fields
    const updateData = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    
    // Prevent updating other fields through this endpoint
    if (Object.keys(otherData).length > 0) {
      console.log('Attempted to update restricted fields:', Object.keys(otherData));
      return res.status(400).json({ 
        success: false,
        message: 'Only phone and address can be updated through this endpoint' 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      console.error('User not found for profile update:', req.user._id);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    console.log('Profile updated successfully for user:', user._id);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;
