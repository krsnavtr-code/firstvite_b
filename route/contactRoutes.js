import { Router } from 'express';
import { 
  submitContactForm, 
  getAllContacts, 
  updateContactStatus 
} from '../controller/contactController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = Router();

// Public route for submitting contact form
router.post('/', submitContactForm);

// Protected admin routes
router.get('/', 
  protect, 
  isAdmin, 
  getAllContacts
);

router.patch('/:id/status', 
  protect, 
  isAdmin, 
  updateContactStatus
);

// Export the router as default
export default router;
