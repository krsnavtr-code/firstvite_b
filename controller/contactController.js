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
    
    // Prepare success response
    const responseData = { 
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        id: savedContact._id,
        name: savedContact.name,
        email: savedContact.email,
        subject: savedContact.subject,
        submittedAt: savedContact.submittedAt
      }
    };

    // Send response
    console.log('Sending success response:', responseData);
    return res.status(201).json(responseData);
    
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
    const { status, date, course, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (date) {
      console.log('Filtering by date:', date);
      // Create a date range for the selected date (from start to end of day)
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      console.log('Date range:', { startDate, endDate });
      
      query.submittedAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (course) {
      console.log('Filtering by course:', course);
      query.courseTitle = { $regex: course, $options: 'i' }; // Case-insensitive partial match
    }
    
    // Convert limit to number and ensure it's positive
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    
    const contacts = await Contact.find(query)
      .sort({ submittedAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);
      
    const totalItems = await Contact.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limitNum);
    
    console.log('Pagination info:', {
      totalItems,
      totalPages,
      currentPage: pageNum,
      itemsPerPage: limitNum,
      itemsInResponse: contacts.length
    });
    
    res.json({
      success: true,
      data: contacts,
      meta: {
        total: totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum
      },
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
