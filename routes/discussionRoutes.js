import express from 'express';
const router = express.Router();

import {
  getDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addComment,
  toggleReaction,
  markAsSolution,
  togglePinDiscussion,
  toggleLockDiscussion
} from '../controllers/discussionController.js';
import { protect } from '../middleware/auth.js';

// Public routes
router.get('/', getDiscussions);
router.get('/:id', getDiscussion);

// Protected routes
router.use(protect);

// Discussion CRUD
router.post('/', createDiscussion);
router.put('/:id', updateDiscussion);
router.delete('/:id', deleteDiscussion);

// Comments
router.post('/:id/comments', addComment);

// Reactions
router.put('/:id/reaction', toggleReaction);

// Solution
router.put('/:id/solution/:commentId', markAsSolution);

// Admin/Moderator routes
router.put('/:id/pin', togglePinDiscussion);
router.put('/:id/lock', toggleLockDiscussion);

export default router;
