import express from 'express';
import { getExternalContacts } from '../controller/externalContactController.js';

const router = express.Router();

// Token-based authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.params.token;
    const expectedToken = 'firstvite_data_importing_in_origanation_id_1_FV';

  if (!token || token !== expectedToken) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing token'
    });
  }
  next();
};

// External API endpoint with token-based authentication
router.get('/:token', authenticateToken, getExternalContacts);

export default router;
