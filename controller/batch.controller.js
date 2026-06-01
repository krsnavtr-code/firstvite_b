import Batch from "../model/batch.model.js";
import Course from "../model/course.model.js";
import User from "../model/User.js";
import { validationResult } from "express-validator";

// Create a new batch
export const createBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      name,
      code,
      course,
      teacher,
      startDate,
      endDate,
      schedule,
      maxCapacity,
      location,
      meetingLink,
      description,
    } = req.body;

    // Verify course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Verify teacher exists and has teacher role
    const teacherExists = await User.findOne({ _id: teacher, role: "teacher" });
    if (!teacherExists) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or invalid role",
      });
    }

    // Check if batch code already exists
    const existingBatch = await Batch.findOne({ code });
    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: "Batch code already exists",
      });
    }

    // Create batch
    const batch = new Batch({
      name,
      code,
      course,
      teacher,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      schedule,
      maxCapacity: maxCapacity || 30,
      currentEnrollment: 0,
      location,
      meetingLink,
      whatsappGroupLink,
      description,
    });

    const savedBatch = await batch.save();

    // Update course's batches array
    await Course.findByIdAndUpdate(
      course,
      { $addToSet: { batches: savedBatch._id } },
      { new: true },
    );

    // Update teacher's assignedBatches array
    await User.findByIdAndUpdate(
      teacher,
      { $addToSet: { assignedBatches: savedBatch._id } },
      { new: true },
    );

    // Populate related fields
    const populatedBatch = await Batch.findById(savedBatch._id)
      .populate("course", "title _id")
      .populate("teacher", "fullname email _id");

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: populatedBatch,
    });
  } catch (error) {
    console.error("Error creating batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all batches with optional filters
export const getAllBatches = async (req, res) => {
  try {
    const { course, teacher, status, search, limit, sort } = req.query;

    const query = {};

    // Add course filter if provided
    if (course) {
      query.course = course;
    }

    // Add teacher filter if provided
    if (teacher) {
      query.teacher = teacher;
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Handle search query
    if (search && search.trim()) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: { $regex: searchRegex } },
        { code: { $regex: searchRegex } },
      ];
    }

    // Build the sort object
    let sortObj = { createdAt: -1 };
    if (sort) {
      sortObj = {};
      const sortFields = sort.split(",");
      sortFields.forEach((field) => {
        const sortOrder = field.startsWith("-") ? -1 : 1;
        const fieldName = field.replace(/^-/, "");
        sortObj[fieldName] = sortOrder;
      });
    }

    // Execute the query
    let batchesQuery = Batch.find(query)
      .populate("course", "title _id")
      .populate("teacher", "fullname email _id")
      .sort(sortObj);

    // Apply limit if specified
    if (limit && !isNaN(parseInt(limit))) {
      batchesQuery = batchesQuery.limit(parseInt(limit));
    }

    const batches = await batchesQuery.exec();

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get single batch by ID
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate("course", "title description _id")
      .populate("teacher", "fullname email department _id");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update a batch
export const updateBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const batchId = req.params.id;
    const {
      name,
      code,
      course,
      teacher,
      startDate,
      endDate,
      schedule,
      maxCapacity,
      location,
      meetingLink,
      description,
      status,
      isActive,
    } = req.body;

    // Find existing batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // If changing course, verify it exists
    const oldCourseId = batch.course.toString();
    if (course && course !== oldCourseId) {
      const courseExists = await Course.findById(course);
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
      // Remove from old course's batches array
      await Course.findByIdAndUpdate(
        oldCourseId,
        { $pull: { batches: batch._id } },
        { new: true },
      );
    }

    // If changing teacher, verify they exist and have teacher role
    const oldTeacherId = batch.teacher.toString();
    if (teacher && teacher !== oldTeacherId) {
      const teacherExists = await User.findOne({
        _id: teacher,
        role: "teacher",
      });
      if (!teacherExists) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found or invalid role",
        });
      }
      // Remove from old teacher's assignedBatches array
      await User.findByIdAndUpdate(
        oldTeacherId,
        { $pull: { assignedBatches: batch._id } },
        { new: true },
      );
    }

    // If changing code, check for duplicates
    if (code && code !== batch.code) {
      const existingBatch = await Batch.findOne({ code });
      if (existingBatch) {
        return res.status(400).json({
          success: false,
          message: "Batch code already exists",
        });
      }
    }

    // Update fields
    if (name) batch.name = name;
    if (code) batch.code = code;
    if (course) batch.course = course;
    if (teacher) batch.teacher = teacher;
    if (startDate) batch.startDate = new Date(startDate);
    if (endDate) batch.endDate = new Date(endDate);
    if (schedule !== undefined) batch.schedule = schedule;
    if (maxCapacity !== undefined) batch.maxCapacity = maxCapacity;
    if (location !== undefined) batch.location = location;
    if (meetingLink !== undefined) batch.meetingLink = meetingLink;
    if (whatsappGroupLink !== undefined)
      batch.whatsappGroupLink = whatsappGroupLink;
    if (description !== undefined) batch.description = description;
    if (status) batch.status = status;
    if (isActive !== undefined) batch.isActive = isActive;

    const updatedBatch = await batch.save();

    // Add to new course's batches array if course changed
    if (course && course !== oldCourseId) {
      await Course.findByIdAndUpdate(
        course,
        { $addToSet: { batches: updatedBatch._id } },
        { new: true },
      );
    }

    // Add to new teacher's assignedBatches array if teacher changed
    if (teacher && teacher !== oldTeacherId) {
      await User.findByIdAndUpdate(
        teacher,
        { $addToSet: { assignedBatches: updatedBatch._id } },
        { new: true },
      );
    }

    // Populate related fields
    const populatedBatch = await Batch.findById(updatedBatch._id)
      .populate("course", "title _id")
      .populate("teacher", "fullname email _id");

    res.json({
      success: true,
      message: "Batch updated successfully",
      data: populatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete a batch
export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Remove from course's batches array
    await Course.findByIdAndUpdate(
      batch.course,
      { $pull: { batches: batch._id } },
      { new: true },
    );

    // Remove from teacher's assignedBatches array
    await User.findByIdAndUpdate(
      batch.teacher,
      { $pull: { assignedBatches: batch._id } },
      { new: true },
    );

    // Delete the batch
    await Batch.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get batches by course
export const getBatchesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status } = req.query;

    const query = { course: courseId };
    if (status) {
      query.status = status;
    }

    const batches = await Batch.find(query)
      .populate("teacher", "fullname email department _id")
      .sort({ startDate: 1 });

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches by course:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get batches by teacher
export const getBatchesByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status } = req.query;

    const query = { teacher: teacherId };
    if (status) {
      query.status = status;
    }

    const batches = await Batch.find(query)
      .populate("course", "title description _id")
      .sort({ startDate: 1 });

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches by teacher:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update batch enrollment count
export const updateBatchEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'increment' or 'decrement'

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (action === "increment") {
      if (batch.currentEnrollment >= batch.maxCapacity) {
        return res.status(400).json({
          success: false,
          message: "Batch is at maximum capacity",
        });
      }
      batch.currentEnrollment += 1;
    } else if (action === "decrement") {
      if (batch.currentEnrollment > 0) {
        batch.currentEnrollment -= 1;
      }
    }

    await batch.save();

    res.json({
      success: true,
      message: "Enrollment updated successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Error updating batch enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
