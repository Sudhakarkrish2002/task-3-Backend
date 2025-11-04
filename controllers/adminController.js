import User from '../models/User.js';
import Course from '../models/Course.js';
import Internship from '../models/Internship.js';
import Blog from '../models/Blog.js';
import Payment from '../models/Payment.js';
import Submission from '../models/Submission.js';

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Get all statistics in parallel
    const [
      totalStudents,
      totalEmployers,
      activeColleges,
      totalCourses,
      ongoingInternships,
      pendingApprovals,
      recentPayments,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([
      // Total Students Registered
      User.countDocuments({ role: 'student', isActive: true }),
      
      // Total Employers Registered
      User.countDocuments({ role: 'employer', isActive: true }),
      
      // Active Colleges
      User.countDocuments({ role: 'college', isActive: true }),
      
      // Total Courses
      Course.countDocuments({ isActive: true }),
      
      // Ongoing Internships
      Internship.countDocuments({ 
        status: 'active',
        isActive: true,
        applicationDeadline: { $gte: new Date() }
      }),
      
      // Pending Approvals (Blogs + Submissions)
      Promise.all([
        Blog.countDocuments({ status: 'submitted' }),
        Submission.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'content_writer', isVerified: false })
      ]).then(([blogs, submissions, contentWriters]) => 
        blogs + submissions + contentWriters
      ),
      
      // Recent Payments (last 10)
      Payment.find({ paymentStatus: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('userName userEmail amount paymentStatus createdAt orderId items')
        .lean(),
      
      // Total Revenue
      Payment.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Monthly Revenue (current month)
      Payment.aggregate([
        {
          $match: {
            paymentStatus: 'completed',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Process revenue data
    const totalRevenueAmount = totalRevenue[0]?.total || 0;
    const monthlyRevenueAmount = monthlyRevenue[0]?.total || 0;

    // Additional statistics
    const [
      publishedCourses,
      draftCourses,
      totalInternships,
      activeBlogs,
      enrolledStudents
    ] = await Promise.all([
      Course.countDocuments({ isPublished: true, isActive: true }),
      Course.countDocuments({ isPublished: false, isActive: true }),
      Internship.countDocuments({ isActive: true }),
      Blog.countDocuments({ status: 'published' }),
      User.countDocuments({ 
        role: 'student',
        'studentDetails.enrolledCourses': { $exists: true, $ne: [] },
        isActive: true
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        // Dashboard Widgets
        widgets: {
          totalStudentsRegistered: totalStudents,
          totalEmployersRegistered: totalEmployers,
          activeColleges: activeColleges,
          totalCourses: totalCourses,
          ongoingInternships: ongoingInternships,
          pendingApprovals: pendingApprovals,
          recentPayments: recentPayments.length,
          totalRevenue: totalRevenueAmount,
          monthlyRevenue: monthlyRevenueAmount
        },
        // Additional Stats
        additionalStats: {
          publishedCourses,
          draftCourses,
          totalInternships,
          activeBlogs,
          enrolledStudents
        },
        // Recent Payments Details
        recentPayments: recentPayments,
        // Growth metrics (can be calculated for previous periods)
        growth: {
          studentsGrowth: 0, // Can be calculated by comparing with previous period
          revenueGrowth: 0,  // Can be calculated by comparing with previous period
          courseEnrollments: enrolledStudents
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get all students with filters
// @route   GET /api/admin/students
// @access  Private/Admin
export const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, course } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { role: 'student' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter by course
    if (course) {
      query['studentDetails.course'] = { $regex: course, $options: 'i' };
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

// @desc    Get student by ID
// @route   GET /api/admin/students/:id
// @access  Private/Admin
export const getStudentById = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password');

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message
    });
  }
};

// @desc    Update student status
// @route   PUT /api/admin/students/:id
// @access  Private/Admin
export const updateStudent = async (req, res) => {
  try {
    const { isActive, isVerified } = req.body;

    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (isActive !== undefined) student.isActive = isActive;
    if (isVerified !== undefined) student.isVerified = isVerified;

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
};

// @desc    Get all employers with filters
// @route   GET /api/admin/employers
// @access  Private/Admin
export const getAllEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'employer' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'employerDetails.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const employers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        employers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employers',
      error: error.message
    });
  }
};

// @desc    Get employer by ID
// @route   GET /api/admin/employers/:id
// @access  Private/Admin
export const getEmployerById = async (req, res) => {
  try {
    const employer = await User.findById(req.params.id)
      .select('-password')
      .populate('employerDetails.postedJobs.jobId', 'title status')
      .populate('employerDetails.postedInternships.internshipId', 'title status');

    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employer',
      error: error.message
    });
  }
};

// @desc    Get all colleges with filters
// @route   GET /api/admin/colleges
// @access  Private/Admin
export const getAllColleges = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'college' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'collegeDetails.collegeName': { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const colleges = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        colleges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges',
      error: error.message
    });
  }
};

// @desc    Get college by ID
// @route   GET /api/admin/colleges/:id
// @access  Private/Admin
export const getCollegeById = async (req, res) => {
  try {
    const college = await User.findById(req.params.id)
      .select('-password')
      .populate('collegeDetails.registeredStudents.studentId', 'name email');

    if (!college || college.role !== 'college') {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    res.status(200).json({
      success: true,
      data: college
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching college',
      error: error.message
    });
  }
};

// @desc    Get all courses with filters
// @route   GET /api/admin/courses
// @access  Private/Admin
export const getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }

    if (status === 'published') {
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = false;
    }

    if (category) {
      query.category = category;
    }

    query.isActive = status !== 'inactive';

    const courses = await Course.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// @desc    Get all blogs with filters
// @route   GET /api/admin/blogs
// @access  Private/Admin
export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }

    if (status) {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

// @desc    Approve or reject blog
// @route   PUT /api/admin/blogs/:id/approve
// @access  Private/Admin
export const approveBlog = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (action === 'approve') {
      blog.status = 'approved';
      blog.approvedBy = req.user._id;
      blog.approvedAt = new Date();
      blog.publishedDate = new Date();
      blog.rejectedReason = '';
    } else if (action === 'reject') {
      blog.status = 'rejected';
      blog.rejectedReason = reason || 'Not meeting quality standards';
      blog.approvedBy = req.user._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: `Blog ${action}d successfully`,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message
    });
  }
};

// @desc    Get all submissions with filters
// @route   GET /api/admin/submissions
// @access  Private/Admin
export const getAllSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const submissions = await Submission.find(query)
      .populate('submittedBy', 'name email role')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
};

// @desc    Review submission
// @route   PUT /api/admin/submissions/:id/review
// @access  Private/Admin
export const reviewSubmission = async (req, res) => {
  try {
    const { action, reviewNotes, rejectionReason } = req.body;

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (action === 'approve') {
      submission.status = 'approved';
      submission.reviewNotes = reviewNotes;
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
      submission.publishedAt = new Date();
    } else if (action === 'reject') {
      submission.status = 'rejected';
      submission.rejectionReason = rejectionReason || reviewNotes;
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
    } else if (action === 'needs_revision') {
      submission.status = 'needs_revision';
      submission.reviewNotes = reviewNotes;
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve", "reject", or "needs_revision"'
      });
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: `Submission ${action}d successfully`,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reviewing submission',
      error: error.message
    });
  }
};

// @desc    Export students data as CSV
// @route   GET /api/admin/students/export
// @access  Private/Admin
export const exportStudentsData = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    let csv = 'Name,Email,Phone,College,Course,Year,Is Active,Is Verified,Created At\n';
    
    students.forEach(student => {
      const name = (student.name || '').replace(/,/g, ';');
      const email = student.email || '';
      const phone = student.phone || '';
      const college = (student.studentDetails?.collegeName || '').replace(/,/g, ';');
      const course = (student.studentDetails?.course || '').replace(/,/g, ';');
      const year = student.studentDetails?.year || '';
      const isActive = student.isActive ? 'Yes' : 'No';
      const isVerified = student.isVerified ? 'Yes' : 'No';
      const createdAt = student.createdAt?.toISOString() || '';
      
      csv += `${name},${email},${phone},${college},${course},${year},${isActive},${isVerified},${createdAt}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students-export.csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting students data',
      error: error.message
    });
  }
};

// @desc    Approve or reject college
// @route   PUT /api/admin/colleges/:id/approve
// @access  Private/Admin
export const approveCollege = async (req, res) => {
  try {
    const { action, partnershipLevel, rejectionReason } = req.body; // action: 'approve' or 'reject'

    const college = await User.findById(req.params.id);

    if (!college || college.role !== 'college') {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    if (action === 'approve') {
      college.collegeDetails.adminApprovalStatus = 'approved';
      college.collegeDetails.approvedBy = req.user._id;
      college.collegeDetails.approvedAt = new Date();
      college.isVerified = true;
      if (partnershipLevel) {
        college.collegeDetails.partnershipLevel = partnershipLevel;
      }
      college.collegeDetails.rejectionReason = '';
    } else if (action === 'reject') {
      college.collegeDetails.adminApprovalStatus = 'rejected';
      college.collegeDetails.rejectionReason = rejectionReason || 'Not meeting requirements';
      college.collegeDetails.approvedBy = req.user._id;
      college.isVerified = false;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    await college.save();

    res.status(200).json({
      success: true,
      message: `College ${action}d successfully`,
      data: college
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating college',
      error: error.message
    });
  }
};

// @desc    Update college partnership level
// @route   PUT /api/admin/colleges/:id/partnership
// @access  Private/Admin
export const updateCollegePartnership = async (req, res) => {
  try {
    const { partnershipLevel } = req.body;

    const college = await User.findById(req.params.id);

    if (!college || college.role !== 'college') {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    if (!['basic', 'standard', 'premium', 'enterprise'].includes(partnershipLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid partnership level. Must be: basic, standard, premium, or enterprise'
      });
    }

    college.collegeDetails.partnershipLevel = partnershipLevel;
    await college.save();

    res.status(200).json({
      success: true,
      message: 'Partnership level updated successfully',
      data: college
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating partnership level',
      error: error.message
    });
  }
};

// @desc    Approve or reject internship
// @route   PUT /api/admin/internships/:id/approve
// @access  Private/Admin
export const approveInternship = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'

    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    if (action === 'approve') {
      internship.adminApprovalStatus = 'approved';
      internship.approvedBy = req.user._id;
      internship.approvedAt = new Date();
      internship.rejectionReason = '';
      // Auto-activate if approved
      if (internship.status === 'draft') {
        internship.status = 'active';
      }
    } else if (action === 'reject') {
      internship.adminApprovalStatus = 'rejected';
      internship.rejectionReason = rejectionReason || 'Not meeting quality standards';
      internship.approvedBy = req.user._id;
      internship.status = 'closed';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    await internship.save();

    res.status(200).json({
      success: true,
      message: `Internship ${action}d successfully`,
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating internship',
      error: error.message
    });
  }
};

// @desc    Get all internships for admin with filters
// @route   GET /api/admin/internships
// @access  Private/Admin
export const getAllInternshipsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, adminApprovalStatus, location, category } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }

    if (status) {
      query.status = status;
    }

    if (adminApprovalStatus) {
      query.adminApprovalStatus = adminApprovalStatus;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    const internships = await Internship.find(query)
      .populate('company', 'name email employerDetails.companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Internship.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        internships,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching internships',
      error: error.message
    });
  }
};

// @desc    Get internship by ID with applications
// @route   GET /api/admin/internships/:id
// @access  Private/Admin
export const getInternshipByIdAdmin = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name email employerDetails')
      .populate('applications.studentId', 'name email phone studentDetails');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.status(200).json({
      success: true,
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching internship',
      error: error.message
    });
  }
};

