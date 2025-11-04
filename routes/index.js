import express from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import courseRoutes from './course.js';
import blogRoutes from './blog.js';
import internshipRoutes from './internship.js';
import workshopRoutes from './workshop.js';
import paymentRoutes from './payment.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/courses', courseRoutes);
router.use('/blogs', blogRoutes);
router.use('/internships', internshipRoutes);
router.use('/workshops', workshopRoutes);
router.use('/payments', paymentRoutes);

export default router;

