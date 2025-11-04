import express from 'express';
import {
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  getAllWorkshops,
  getWorkshopById,
  publishWorkshop
} from '../controllers/workshopController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllWorkshops);

// Specific routes before dynamic :id
router.put('/:id/publish', protect, authorize('admin'), publishWorkshop);

// Dynamic routes
router.get('/:id', getWorkshopById);

// Protected routes - Admin only
router.post('/', protect, authorize('admin'), createWorkshop);
router.put('/:id', protect, authorize('admin'), updateWorkshop);
router.delete('/:id', protect, authorize('admin'), deleteWorkshop);

export default router;

