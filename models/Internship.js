import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an internship title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide an internship description']
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide an employer']
  },
  companyName: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: [true, 'Please provide location']
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'freelance'],
    default: 'full-time'
  },
  duration: {
    type: String,
    required: [true, 'Please provide internship duration']
  },
  stipend: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    type: {
      type: String,
      enum: ['fixed', 'performance-based', 'unpaid'],
      default: 'fixed'
    }
  },
  skillsRequired: [String],
  qualifications: [String],
  responsibilities: [String],
  benefits: [String],
  applicationDeadline: {
    type: Date,
    required: true
  },
  startDate: Date,
  positionsAvailable: {
    type: Number,
    required: true,
    min: 1
  },
  applicationsReceived: {
    type: Number,
    default: 0
  },
  applications: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    studentName: String,
    studentEmail: String,
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'shortlisted', 'rejected', 'accepted'],
      default: 'applied'
    },
    resumeUrl: String,
    coverLetter: String
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'filled'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
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
  rejectionReason: String,
  category: {
    type: String,
    required: true
  },
  tags: [String]
}, {
  timestamps: true
});

// Index for search
internshipSchema.index({ title: 'text', description: 'text', skillsRequired: 'text' });

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;

