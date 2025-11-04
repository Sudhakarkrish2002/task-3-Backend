import express from 'express';
import {
  createInternship,
  updateInternship,
  deleteInternship,
  getAllInternships,
  getInternshipById,
  getMyInternships
} from '../controllers/internshipController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllInternships);

// Specific routes before dynamic :id
router.get('/my-internships/list', protect, authorize('employer'), getMyInternships);

// Dynamic routes
router.get('/:id', getInternshipById);

// Protected routes - Employers
router.post('/', protect, authorize('employer'), createInternship);

// Protected routes - Employer (own internships) or Admin
router.put('/:id', protect, authorize('employer', 'admin'), updateInternship);
router.delete('/:id', protect, authorize('employer', 'admin'), deleteInternship);

export default router;

