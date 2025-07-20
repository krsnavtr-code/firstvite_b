import DirectPayment from '../model/directPayment.model.js';
import { validationResult } from 'express-validator';

// @desc    Create a new direct payment
// @route   POST /api/payments/direct
// @access  Public (can be protected if needed)
export const createDirectPayment = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { 
      name, 
      email, 
      phone, 
      course, 
      address, 
      paymentAmount,
      userId = null
    } = req.body;

    // Create new payment record
    const payment = new DirectPayment({
      name,
      email,
      phone,
      course,
      address,
      paymentAmount: Number(paymentAmount),
      userId: userId || null
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment details saved successfully',
      data: {
        paymentId: payment._id,
        name: payment.name,
        email: payment.email,
        amount: payment.paymentAmount,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Error saving payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get payment details by ID
// @route   GET /api/payments/:id
// @access  Private (Admin or the user who made the payment)
export const getPaymentDetails = async (req, res) => {
  try {
    const payment = await DirectPayment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized to view this payment
    if (payment.userId && payment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
