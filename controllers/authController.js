import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, ...roleSpecificData } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role'
      });
    }

    // Validate role
    const validRoles = ['admin', 'student', 'employer', 'college', 'content_writer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Build user data based on role
    const userData = {
      name,
      email,
      password,
      role,
      phone
    };

    // Add role-specific data
    if (role === 'employer') {
      userData.employerDetails = {
        companyName: roleSpecificData.companyName || '',
        companyWebsite: roleSpecificData.companyWebsite || '',
        companyDescription: roleSpecificData.companyDescription || '',
        industry: roleSpecificData.industry || '',
        address: roleSpecificData.address || {}
      };
    } else if (role === 'college') {
      userData.collegeDetails = {
        collegeName: roleSpecificData.collegeName || '',
        registrationNumber: roleSpecificData.registrationNumber || '',
        address: roleSpecificData.address || {},
        contactPerson: roleSpecificData.contactPerson || name,
        contactEmail: roleSpecificData.contactEmail || email,
        contactPhone: roleSpecificData.contactPhone || phone
      };
    } else if (role === 'content_writer') {
      userData.contentWriterDetails = {
        bio: roleSpecificData.bio || '',
        specialization: roleSpecificData.specialization || []
      };
    } else if (role === 'student') {
      userData.studentDetails = {
        collegeName: roleSpecificData.collegeName || '',
        course: roleSpecificData.course || '',
        year: roleSpecificData.year || '',
        enrollmentDate: new Date()
      };
    } else if (role === 'admin') {
      // Admin registration should be restricted - only by other admins
      userData.isVerified = true;
      userData.adminDetails = {
        permissions: roleSpecificData.permissions || [
          'manage_users',
          'manage_courses',
          'manage_content',
          'manage_blogs',
          'manage_internships',
          'view_analytics',
          'manage_settings'
        ]
      };
    }

    // Create user
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse,
      roleDescription: user.getRoleDescription()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login for admin
    if (user.role === 'admin' && user.adminDetails) {
      user.adminDetails.lastLogin = new Date();
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
      roleDescription: user.getRoleDescription()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user,
      roleDescription: user.getRoleDescription()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Get all roles with descriptions
// @route   GET /api/auth/roles
// @access  Public
export const getRoles = async (req, res) => {
  try {
    const roles = [
      {
        role: 'admin',
        description: 'Full access to manage courses, users, and content.'
      },
      {
        role: 'student',
        description: 'Can enroll in courses, apply for internships, and earn certificates.'
      },
      {
        role: 'employer',
        description: 'Can post jobs/internships and view applicants.'
      },
      {
        role: 'college',
        description: 'Registers students and tracks performance.'
      },
      {
        role: 'content_writer',
        description: 'Creates and edits learning or blog content (requires admin approval).'
      }
    ];

    res.status(200).json({
      success: true,
      roles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      error: error.message
    });
  }
};

