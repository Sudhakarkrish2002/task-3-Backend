import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'student', 'employer', 'college', 'content_writer'],
    required: [true, 'Please provide a role'],
    default: 'student'
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Student specific fields
  studentDetails: {
    collegeName: String,
    course: String,
    year: String,
    enrollmentDate: Date,
    certificates: [{
      courseId: mongoose.Schema.Types.ObjectId,
      courseName: String,
      issueDate: Date,
      certificateUrl: String
    }],
    enrolledCourses: [{
      courseId: mongoose.Schema.Types.ObjectId,
      enrolledDate: Date,
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      status: {
        type: String,
        enum: ['enrolled', 'in_progress', 'completed', 'dropped'],
        default: 'enrolled'
      }
    }],
    internships: [{
      internshipId: mongoose.Schema.Types.ObjectId,
      appliedDate: Date,
      status: {
        type: String,
        enum: ['applied', 'shortlisted', 'rejected', 'accepted'],
        default: 'applied'
      }
    }]
  },
  // Employer specific fields
  employerDetails: {
    companyName: {
      type: String,
      required: function() { return this.role === 'employer'; }
    },
    companyWebsite: String,
    companyDescription: String,
    industry: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    postedJobs: [{
      jobId: mongoose.Schema.Types.ObjectId,
      title: String,
      postedDate: Date,
      status: {
        type: String,
        enum: ['active', 'closed', 'draft'],
        default: 'active'
      }
    }],
    postedInternships: [{
      internshipId: mongoose.Schema.Types.ObjectId,
      title: String,
      postedDate: Date,
      status: {
        type: String,
        enum: ['active', 'closed', 'draft'],
        default: 'active'
      }
    }]
  },
  // College specific fields
  collegeDetails: {
    collegeName: {
      type: String,
      required: function() { return this.role === 'college'; }
    },
    registrationNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    contactPerson: String,
    contactEmail: String,
    contactPhone: String,
    registeredStudents: [{
      studentId: mongoose.Schema.Types.ObjectId,
      registrationDate: Date,
      status: {
        type: String,
        enum: ['active', 'inactive', 'graduated'],
        default: 'active'
      }
    }],
    performanceMetrics: {
      totalStudents: {
        type: Number,
        default: 0
      },
      activeStudents: {
        type: Number,
        default: 0
      },
      completedCourses: {
        type: Number,
        default: 0
      }
    },
    partnershipLevel: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'enterprise'],
      default: 'basic'
    },
    adminApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String
  },
  // Content Writer specific fields
  contentWriterDetails: {
    bio: String,
    specialization: [String],
    articlesWritten: [{
      articleId: mongoose.Schema.Types.ObjectId,
      title: String,
      status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'published', 'rejected'],
        default: 'draft'
      },
      submissionDate: Date,
      publishDate: Date
    }],
    totalArticles: {
      type: Number,
      default: 0
    },
    approvedArticles: {
      type: Number,
      default: 0
    }
  },
  // Admin specific fields
  adminDetails: {
    permissions: [{
      type: String,
      enum: ['manage_users', 'manage_courses', 'manage_content', 'manage_blogs', 'manage_internships', 'view_analytics', 'manage_settings']
    }],
    lastLogin: Date
  },
  avatar: {
    type: String,
    default: ''
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationExpire: Date
}, {
  timestamps: true
});

// Compound unique index: same email can exist for different roles
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get user role description
userSchema.methods.getRoleDescription = function() {
  const roleDescriptions = {
    admin: 'Full access to manage courses, users, and content.',
    student: 'Can enroll in courses, apply for internships, and earn certificates.',
    employer: 'Can post jobs/internships and view applicants.',
    college: 'Registers students and tracks performance.',
    content_writer: 'Creates and edits learning or blog content (requires admin approval).'
  };
  return roleDescriptions[this.role] || 'User';
};

const User = mongoose.model('User', userSchema);

export default User;

