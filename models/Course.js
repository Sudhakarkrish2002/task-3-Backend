import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a course title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a course description']
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  category: {
    type: String,
    required: [true, 'Please provide a course category'],
    enum: ['certification', 'placement_training', 'workshop', 'other'],
    default: 'other'
  },
  instructor: {
    type: String,
    required: [true, 'Please provide an instructor name']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a course price'],
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  duration: {
    type: String,
    required: [true, 'Please provide course duration']
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  language: {
    type: String,
    default: 'English'
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videoPreview: {
    type: String,
    default: ''
  },
  curriculum: [{
    sectionTitle: String,
    lessons: [{
      lessonTitle: String,
      lessonType: {
        type: String,
        enum: ['video', 'reading', 'quiz', 'assignment'],
        default: 'video'
      },
      duration: String,
      isLocked: {
        type: Boolean,
        default: false
      }
    }]
  }],
  learningOutcomes: [String],
  prerequisites: [String],
  tags: [String],
  enrolledCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  certificateIncluded: {
    type: Boolean,
    default: false
  },
  placementGuaranteed: {
    type: Boolean,
    default: false
  },
  startDate: Date,
  endDate: Date,
  syllabus: {
    overview: {
      type: String,
      default: ''
    },
    modules: [{
      title: {
        type: String,
        required: true
      },
      duration: {
        type: String,
        default: ''
      },
      topics: [{
        type: String
      }]
    }],
    learningOutcomes: [{
      type: String
    }],
    prerequisites: [{
      type: String
    }],
    projects: [{
      name: {
        type: String,
        required: true
      },
      description: {
        type: String,
        default: ''
      }
    }],
    certification: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Index for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Course = mongoose.model('Course', courseSchema);

export default Course;

