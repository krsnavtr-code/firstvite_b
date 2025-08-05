import Contact from '../models/contactModel.js';
import asyncHandler from 'express-async-handler';

// @desc    Get all contacts with pagination and filtering
// @route   GET /api/contacts
// @access  Private/Admin
export const getAllContacts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  // Build query
  const query = {};
  
  // Filter by status if provided
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Search in name, email, or message if search term is provided
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { message: searchRegex },
      { subject: searchRegex }
    ];
  }
  
  // Execute query with pagination
  const [contacts, total] = await Promise.all([
    Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(query)
  ]);
  
  // Calculate pagination values
  const pages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    count: contacts.length,
    total,
    page,
    pages,
    data: contacts
  });
});

// @desc    Update contact status
// @route   PATCH /api/contacts/:id/status
// @access  Private/Admin
export const updateContactStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    res.status(400);
    throw new Error('Please provide a status');
  }
  
  const contact = await Contact.findById(req.params.id);
  
  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }
  
  contact.status = status;
  await contact.save();
  
  res.json({
    success: true,
    data: contact
  });
});

// @desc    Submit a contact form
// @route   POST /api/contacts
// @access  Public
export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, courseId, courseTitle } = req.body;
  
  // Basic validation
  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  
  // Check for duplicate submission (same email and message within last 5 minutes)
  const recentSubmission = await Contact.findOne({
    email: email.toLowerCase().trim(),
    message: message.trim(),
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
  });
  
  if (recentSubmission) {
    res.status(429);
    throw new Error('You have recently submitted a similar message. Please wait before submitting again.');
  }
  
  // Create contact
  const contact = await Contact.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ? phone.trim() : undefined,
    subject: subject.trim(),
    message: message.trim(),
    courseId,
    courseTitle: courseTitle ? courseTitle.trim() : undefined,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // TODO: Send email notification to admin
  
  res.status(201).json({
    success: true,
    data: contact,
    message: 'Thank you for your message. We will get back to you soon!'
  });
});
