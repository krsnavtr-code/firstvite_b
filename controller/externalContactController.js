import Contact from '../model/Contact.js';

/**
 * @desc    Get all contacts for external API
 * @route   GET /api/outcontact/:token
 * @access  Protected by token
 */
export const getExternalContacts = async (req, res) => {
  try {
    // Get query parameters with defaults
    const { 
      status,
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    const query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) {
        query.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = endOfDay;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contact.countDocuments(query);
    
    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format response
    const response = {
      success: true,
      count: contacts.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        courseId: contact.courseId || '',
        courseTitle: contact.courseTitle || '',
        submittedAt: contact.submittedAt,
        updatedAt: contact.updatedAt
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error in getExternalContacts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
