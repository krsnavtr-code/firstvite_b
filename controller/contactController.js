import Contact from '../model/Contact.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { sendContactNotifications } from '../utils/email.js';

/**
 * @desc    Submit a contact form
 * @route   POST /api/contacts
 * @access  Public
 */
export const submitContactForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = {};
      errors.array().forEach(error => {
        errorMessages[error.param] = error.msg;
      });
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    const { name, email, phone, message, courseId, courseTitle, subject } = req.body;
    
    // Check if this is a duplicate submission (same email and message within last 5 minutes)
    const recentSubmission = await Contact.findOne({
      email,
      message,
      submittedAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });
    
    if (recentSubmission) {
      return res.status(429).json({
        success: false,
        message: 'You have recently submitted a similar message. Please wait before submitting again.'
      });
    }
    
    // Create new contact
    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      subject: (subject || `Enquiry about ${courseTitle || 'course'}`).trim(),
      message: message.trim(),
      status: 'new',
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };

    // Add course-related fields if they exist
    if (courseId) {
      contactData.courseId = courseId; // Store the original course ID
      contactData.courseTitle = courseTitle?.trim();
    }

    const contact = new Contact(contactData);

    // Save to database
    const savedContact = await contact.save();
    
    // Send email notifications (to user and admin)
    try {
      await sendContactNotifications({
        ...savedContact.toObject(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (emailError) {
      console.error('Error sending contact notifications:', emailError);
      // Don't fail the request if email sending fails
      // Just log the error and continue
    }
    
    // Send success response
    res.status(201).json({ 
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        id: savedContact._id,
        name: savedContact.name,
        email: savedContact.email,
        subject: savedContact.subject,
        submittedAt: savedContact.submittedAt
      }
    });
    
  } catch (error) {
    console.error('Error submitting contact form:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      body: req.body
    });
    
    // Handle duplicate key error (e.g., unique email constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a contact form with this email address.'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = {};
      Object.values(error.errors).forEach(err => {
        errorMessages[err.path] = err.message;
      });
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An error occurred while processing your request. Please try again later.'
    });
  }
};

export const getAllContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    const contacts = await Contact.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('courseInterests', 'title');
      
    const count = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
};

export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update contact status',
      error: error.message
    });
  }
};
