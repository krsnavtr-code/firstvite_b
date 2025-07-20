import express from 'express';
import * as blogController from '../controller/blog.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/posts', blogController.getAllBlogPosts);
router.get('/posts/:slug', blogController.getBlogPost);
router.get('/categories/:category', blogController.getPostsByCategory);
router.get('/search', blogController.searchBlogPosts);

// Protected routes (admin only)
router.use(protect, authorize('admin'));

// Admin routes
router.get('/posts/id/:id', blogController.getBlogPostById);
router.post('/posts', blogController.createBlogPost);
router.patch('/posts/:id', blogController.updateBlogPost);
router.delete('/posts/:id', blogController.deleteBlogPost);

export default router;
