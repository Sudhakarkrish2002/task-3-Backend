import express from 'express';
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
  processRefund,
  getMyPayments,
  createRazorpayOrderHandler,
  verifyRazorpayPayment,
  razorpayWebhook
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Razorpay specific routes
router.post('/razorpay/create-order', protect, createRazorpayOrderHandler);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/razorpay/webhook', razorpayWebhook); // Public route for Razorpay webhooks

// Protected routes - All authenticated users
router.post('/', protect, createPayment);

// Specific routes before dynamic :id
router.get('/my-payments/list', protect, getMyPayments);
router.get('/list', protect, authorize('admin'), getAllPayments);
router.put('/:id/status', protect, authorize('admin'), updatePaymentStatus);
router.put('/:id/refund', protect, authorize('admin'), processRefund);

// Dynamic routes
router.get('/:id', protect, getPaymentById);

export default router;

