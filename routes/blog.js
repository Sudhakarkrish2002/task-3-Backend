import express from 'express';
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  getMyBlogs,
  submitBlogForReview
} from '../controllers/blogController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllBlogs);

// Protected routes - Admin and Content Writers
router.post('/', protect, authorize('admin', 'content_writer'), createBlog);

// Specific routes before dynamic :id
router.get('/my-posts/list', protect, authorize('admin', 'content_writer'), getMyBlogs);
router.put('/:id/submit', protect, authorize('admin', 'content_writer'), submitBlogForReview);

// Dynamic routes
router.get('/:id', getBlogById);
router.put('/:id', protect, authorize('admin', 'content_writer'), updateBlog);
router.delete('/:id', protect, authorize('admin', 'content_writer'), deleteBlog);

export default router;

