import express from 'express';
import {
  getDashboardStats,
  getAllStudents,
  getStudentById,
  updateStudent,
  exportStudentsData,
  getAllEmployers,
  getEmployerById,
  getAllColleges,
  getCollegeById,
  approveCollege,
  updateCollegePartnership,
  getAllCourses,
  getAllBlogs,
  approveBlog,
  getAllSubmissions,
  reviewSubmission,
  approveInternship,
  getAllInternshipsAdmin,
  getInternshipByIdAdmin
} from '../controllers/adminController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Student Management
router.get('/students', getAllStudents);
router.get('/students/export', exportStudentsData);
router.get('/students/:id', getStudentById);
router.put('/students/:id', updateStudent);

// Employer Management
router.get('/employers', getAllEmployers);
router.get('/employers/:id', getEmployerById);

// College Management
router.get('/colleges', getAllColleges);
router.get('/colleges/:id', getCollegeById);
router.put('/colleges/:id/approve', approveCollege);
router.put('/colleges/:id/partnership', updateCollegePartnership);

// Internship Management
router.get('/internships', getAllInternshipsAdmin);
router.get('/internships/:id', getInternshipByIdAdmin);
router.put('/internships/:id/approve', approveInternship);

// Course Management
router.get('/courses', getAllCourses);

// Blog Management
router.get('/blogs', getAllBlogs);
router.put('/blogs/:id/approve', approveBlog);

// Submission Management
router.get('/submissions', getAllSubmissions);
router.put('/submissions/:id/review', reviewSubmission);

export default router;

