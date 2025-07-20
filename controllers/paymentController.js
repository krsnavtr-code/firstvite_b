import DirectPayment from '../model/directPayment.model.js';
import { validationResult } from 'express-validator';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Razorpay instance
let razorpay;

try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay credentials are missing. Please check your .env file');
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (error) {
  console.error('Failed to initialize Razorpay:', error.message);
}

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

// @desc    Create a Razorpay order
// @route   POST /api/payments/create-order
// @access  Public (or protected as needed)
export const createRazorpayOrder = async (req, res) => {
  try {
    // Check if Razorpay is properly initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not properly configured. Please contact support.'
      });
    }
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const options = {
      amount: Math.round(amount), // amount in smallest currency unit (paise for INR)
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1 // Auto-capture payment
    };

    if (notes) {
      options.notes = notes;
    }

    const order = await razorpay.orders.create(options);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Public (or protected as needed)
export const verifyPayment = async (req, res) => {
  try {
    // Check if Razorpay is properly initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not properly configured. Please contact support.'
      });
    }
    const { orderId, paymentId, signature, ...paymentData } = req.body;
    
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Create the expected signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    // Compare the signatures
    const isSignatureValid = generatedSignature === signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Save payment details to database
    const payment = new DirectPayment({
      name: paymentData.name,
      email: paymentData.email,
      phone: paymentData.phone,
      course: paymentData.course,
      address: paymentData.address,
      paymentAmount: paymentData.paymentAmount,
      paymentId,
      orderId,
      status: 'completed',
      paymentMethod: 'razorpay',
      userId: paymentData.userId || null
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      paymentId
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Check if the user is authorized to view this payment
    // (Only admin or the user who made the payment)
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
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
