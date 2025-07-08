import Contact from '../model/Contact.js';

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, message, courseInterests } = req.body;
    
    const contact = new Contact({
      name,
      email,
      phone: phone || undefined,
      message,
      courseInterests: courseInterests || [],
      status: 'new',
      submittedAt: new Date()
    });

    await contact.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit contact form',
      error: error.message
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
