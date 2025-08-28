import express from 'express';
import { saveMessage, getMessages, endSession, listSessions, createHandoff, listHandoffs, claimHandoff, closeHandoff } from '../controller/chat.controller.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { admin, protect } from '../middleware/auth.js';

const router = express.Router();

// Allow anonymous users to chat; attach user if token exists
router.get('/messages', optionalAuth, getMessages);
router.post('/message', optionalAuth, saveMessage);
router.post('/end', optionalAuth, endSession);

// Sessions listing for admins
router.get('/sessions', protect, admin, listSessions);

// Agent handoff
router.post('/handoffs', optionalAuth, createHandoff);
router.get('/handoffs', protect, admin, listHandoffs);
router.post('/handoffs/:id/claim', protect, admin, claimHandoff);
router.post('/handoffs/:id/close', protect, admin, closeHandoff);

export default router;
