import TestQA from '../models/testQAModel.js';
import asyncHandler from 'express-async-handler';


const validateQuestionData = (data) => {
  const { questionType, options, correctAnswer } = data;

  if ([questionType.TRUE_FALSE, questionType.SHORT_ANSWER, questionType.ESSAY].includes(questionType)) {
    if (!correctAnswer) {
      throw new Error('Correct answer is required for this question type');
    }
  }
  if ([questionType.MULTIPLE_CHOICE_SINGLE, questionType.MULTIPLE_CHOICE_MULTIPLE].includes(questionType)) {
    if (!options || options.length < 2) {
      throw new Error('At least two options are required for multiple choice questions');
    }
    if (questionType === questionType.MULTIPLE_CHOICE_SINGLE && options.filter(o => o.isCorrect).length !== 1) {
      throw new Error('Exactly one correct option is required for single choice questions');
    }
    if (questionType === questionType.MULTIPLE_CHOICE_MULTIPLE && options.filter(o => o.isCorrect).length < 1) {
      throw new Error('At least one correct option is required for multiple choice questions');
    }
  }
  return true;
};


// @desc    Create a new QA
// @route   POST /api/admin/test-qa
// @access  Private/Admin
export const createQA = asyncHandler(async (req, res) => {
  const { question, questionType, options, correctAnswer, explanation, isActive = true } = req.body;
  // Validate question data
  try {
    validateQuestionData({ questionType, options, correctAnswer });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
  const qa = await TestQA.create({
    question,
    questionType,
    options,
    correctAnswer,
    explanation,
    isActive,
    createdBy: req.user._id,
  });
  res.status(201).json({
    success: true,
    data: qa,
  });
});

// @desc    Get all QAs
// @route   GET /api/admin/test-qa
// @access  Private/Admin
export const getAllQAs = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  
  const query = {};
  if (isActive === 'true' || isActive === 'false') {
    query.isActive = isActive === 'true';
  }

  const qas = await TestQA.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: qas.length,
    data: qas,
  });
});

// @desc    Get single QA
// @route   GET /api/admin/test-qa/:id
// @access  Private/Admin
export const getQAById = asyncHandler(async (req, res) => {
  const qa = await TestQA.findById(req.params.id).populate('createdBy', 'name email');

  if (!qa) {
    res.status(404);
    throw new Error('QA not found');
  }

  res.json({
    success: true,
    data: qa,
  });
});

// @desc    Update QA
// @route   PUT /api/admin/test-qa/:id
// @access  Private/Admin
export const updateQA = asyncHandler(async (req, res) => {
  const { question, answer, isActive } = req.body;

  const qa = await TestQA.findById(req.params.id);

  if (!qa) {
    res.status(404);
    throw new Error('QA not found');
  }

  qa.question = question || qa.question;
  qa.answer = answer || qa.answer;
  
  if (typeof isActive !== 'undefined') {
    qa.isActive = isActive;
  }

  const updatedQA = await qa.save();

  res.json({
    success: true,
    data: updatedQA,
  });
});

/// @desc    Delete QA
// @route   DELETE /api/admin/test-qa/:id
// @access  Private/Admin
export const deleteQA = asyncHandler(async (req, res) => {
  const qa = await TestQA.findById(req.params.id);

  if (!qa) {
    res.status(404);
    throw new Error('QA not found');
  }

  await TestQA.deleteOne({ _id: req.params.id });

  res.json({
    success: true,
    data: {},
  });
});

// @desc    Toggle QA active status
// @route   PATCH /api/admin/test-qa/:id/toggle
// @access  Private/Admin
export const toggleQAActiveStatus = asyncHandler(async (req, res) => {
  const qa = await TestQA.findById(req.params.id);

  if (!qa) {
    res.status(404);
    throw new Error('QA not found');
  }

  qa.isActive = !qa.isActive;
  await qa.save();

  res.json({
    success: true,
    data: qa,
  });
});
