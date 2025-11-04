import express from 'express';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getAllCourses,
  getCourseById,
  getMyCourses,
  publishCourse
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);

// Protected routes - Admin and Content Writers  
router.post('/', protect, authorize('admin', 'content_writer'), createCourse);
router.get('/my-courses/list', protect, authorize('admin', 'content_writer'), getMyCourses);

// Specific routes before dynamic :id
router.put('/:id/publish', protect, authorize('admin'), publishCourse);

// Dynamic routes
router.get('/:id', getCourseById);
router.put('/:id', protect, authorize('admin', 'content_writer'), updateCourse);
router.delete('/:id', protect, authorize('admin'), deleteCourse);

export default router;

