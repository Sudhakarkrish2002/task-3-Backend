import mongoose from 'mongoose';

const workshopSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a workshop title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a workshop description']
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: ['technical', 'soft_skills', 'career', 'industry', 'certification', 'other'],
    default: 'other'
  },
  instructor: {
    type: String,
    required: [true, 'Please provide an instructor name']
  },
  instructorEmail: String,
  instructorBio: String,
  price: {
    type: Number,
    required: [true, 'Please provide a workshop price'],
    min: 0
  },
  duration: {
    type: String,
    required: [true, 'Please provide workshop duration']
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
  mode: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'online'
  },
  location: String, // Required if mode is offline or hybrid
  thumbnail: {
    type: String,
    default: ''
  },
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    sessions: [{
      sessionDate: Date,
      sessionTime: String,
      duration: String,
      topic: String
    }]
  },
  resources: [{
    resourceType: {
      type: String,
      enum: ['document', 'video', 'pdf', 'presentation', 'link', 'other']
    },
    title: String,
    url: String,
    description: String
  }],
  maxParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  learningOutcomes: [String],
  prerequisites: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  certificateIncluded: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for search
workshopSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Workshop = mongoose.model('Workshop', workshopSchema);

export default Workshop;

