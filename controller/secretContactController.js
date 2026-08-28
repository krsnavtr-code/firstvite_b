import Contact from "../model/Contact.js";

/**
 * @desc    Fetch contact leads with only Full_Name, email, phone, courses
 * @route   GET /api/contact-data, GET /api/contact-data/:secretKey, GET /api/contacts/export
 * @access  Protected by Secret Key
 */
export const getSecretContactData = async (req, res) => {
  try {
    const { limit, page, startDate, endDate, status, raw } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

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

    let contactQuery = Contact.find(query).sort({ submittedAt: -1, createdAt: -1 });

    if (limit && !isNaN(parseInt(limit, 10))) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10);
      contactQuery = contactQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const contacts = await contactQuery.lean();

    // Transform each record to ONLY the requested 4 fields
    const formattedData = contacts.map((contact) => {
      // Determine course name
      const courseName =
        contact.courseTitle ||
        (Array.isArray(contact.courses) ? contact.courses.join(", ") : contact.courses) ||
        (contact.courseInterest || "") ||
        (contact.subject && !["General Inquiry", "Contact Form Submission"].includes(contact.subject)
          ? contact.subject
          : "") ||
        contact.courseId ||
        "";

      return {
        Full_Name: contact.name || contact.fullName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        courses: courseName || "",
      };
    });

    if (raw === "true" || raw === "1") {
      return res.status(200).json(formattedData);
    }

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching secret contact data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching contact data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
