import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['blog', 'course_content', 'article', 'other'],
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedByName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedItem: {
    itemType: {
      type: String,
      enum: ['blog', 'course', 'other']
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'needs_revision'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
  publishedAt: Date
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ submittedBy: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;

