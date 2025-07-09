import { body, validationResult } from 'express-validator';

export const contactValidationRules = [
  // Name validation
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
  // Email validation
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
    
  // Phone validation (optional but must be valid if provided)
  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone().withMessage('Please enter a valid phone number'),
    
  // Message validation
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
    
  // Course ID validation (optional, can be any string)
  body('courseId')
    .optional()
    .isString().withMessage('Course ID must be a string'),
    
  // Course title validation (optional)
  body('courseTitle')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Course title is too long'),
    
  // Subject validation (optional)
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Subject is too long')
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));
  
  return res.status(422).json({
    success: false,
    errors: extractedErrors,
  });
};
