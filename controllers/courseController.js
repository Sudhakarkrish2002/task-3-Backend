import Course from '../models/Course.js';

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin or Content Writer
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      instructor,
      price,
      originalPrice,
      duration,
      level,
      language,
      thumbnail,
      videoPreview,
      curriculum,
      learningOutcomes,
      prerequisites,
      tags,
      certificateIncluded,
      placementGuaranteed,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !instructor || !price || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, instructor, price, and duration'
      });
    }

    // Validate category
    const validCategories = ['certification', 'placement_training', 'workshop', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const courseData = {
      title,
      description,
      category,
      instructor,
      price,
      duration,
      createdBy: req.user._id,
      shortDescription,
      originalPrice,
      level,
      language,
      thumbnail,
      videoPreview,
      curriculum,
      learningOutcomes,
      prerequisites,
      tags,
      certificateIncluded,
      placementGuaranteed,
      startDate,
      endDate
    };

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin or Content Writer
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is authorized (admin or the creator)
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'shortDescription', 'category', 'instructor',
      'price', 'originalPrice', 'duration', 'level', 'language', 'thumbnail',
      'videoPreview', 'curriculum', 'learningOutcomes', 'prerequisites',
      'tags', 'certificateIncluded', 'placementGuaranteed', 'startDate',
      'endDate', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });

    // Handle syllabus update if provided
    if (req.body.syllabus !== undefined) {
      // Initialize syllabus object if it doesn't exist
      if (!course.syllabus) {
        course.syllabus = {
          overview: '',
          modules: [],
          learningOutcomes: [],
          prerequisites: [],
          projects: [],
          certification: ''
        };
      }

      const { overview, modules, learningOutcomes, prerequisites, projects, certification } = req.body.syllabus;

      if (overview !== undefined) {
        course.syllabus.overview = overview;
      }
      if (modules !== undefined && Array.isArray(modules)) {
        course.syllabus.modules = modules;
      }
      if (learningOutcomes !== undefined && Array.isArray(learningOutcomes)) {
        course.syllabus.learningOutcomes = learningOutcomes;
      }
      if (prerequisites !== undefined && Array.isArray(prerequisites)) {
        course.syllabus.prerequisites = prerequisites;
      }
      if (projects !== undefined && Array.isArray(projects)) {
        course.syllabus.projects = projects;
      }
      if (certification !== undefined) {
        course.syllabus.certification = certification;
      }
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message
    });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin or Content Writer (own courses)
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is authorized (admin or the creator)
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message
    });
  }
};

// @desc    Get all courses with filters
// @route   GET /api/courses
// @access  Public
export const getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, level, placementGuaranteed } = req.query;
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (placementGuaranteed !== undefined) {
      query.placementGuaranteed = placementGuaranteed === 'true';
    }

    // For public, only show published courses
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
    }

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

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // For public, only show published and active courses
    if (!req.user || req.user.role !== 'admin') {
      if (!course.isPublished || !course.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// @desc    Get courses assigned to a content writer
// @route   GET /api/courses/my-courses
// @access  Private/Admin or Content Writer
export const getMyCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { createdBy: req.user._id };

    if (status) {
      if (status === 'published') {
        query.isPublished = true;
      } else if (status === 'draft') {
        query.isPublished = false;
      }
    }

    const courses = await Course.find(query)
      .select('-curriculum')
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
      message: 'Error fetching your courses',
      error: error.message
    });
  }
};

// @desc    Publish/Unpublish a course
// @route   PUT /api/courses/:id/publish
// @access  Private/Admin or Content Writer (own courses)
export const publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is authorized (admin or the creator)
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this course'
      });
    }

    // Handle course details update if provided (for save and publish workflow)
    const allowedFields = [
      'title', 'description', 'shortDescription', 'category', 'instructor',
      'price', 'originalPrice', 'duration', 'level', 'language', 'thumbnail',
      'videoPreview', 'curriculum', 'learningOutcomes', 'prerequisites',
      'tags', 'certificateIncluded', 'placementGuaranteed', 'startDate',
      'endDate', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });

    // Handle syllabus update if provided (for save and publish workflow)
    if (req.body.syllabus !== undefined) {
      // Initialize syllabus object if it doesn't exist
      if (!course.syllabus) {
        course.syllabus = {
          overview: '',
          modules: [],
          learningOutcomes: [],
          prerequisites: [],
          projects: [],
          certification: ''
        };
      }

      const { overview, modules, learningOutcomes, prerequisites, projects, certification } = req.body.syllabus;

      if (overview !== undefined) {
        course.syllabus.overview = overview;
      }
      if (modules !== undefined && Array.isArray(modules)) {
        course.syllabus.modules = modules;
      }
      if (learningOutcomes !== undefined && Array.isArray(learningOutcomes)) {
        course.syllabus.learningOutcomes = learningOutcomes;
      }
      if (prerequisites !== undefined && Array.isArray(prerequisites)) {
        course.syllabus.prerequisites = prerequisites;
      }
      if (projects !== undefined && Array.isArray(projects)) {
        course.syllabus.projects = projects;
      }
      if (certification !== undefined) {
        course.syllabus.certification = certification;
      }
    }

    // Toggle publish status
    const { action } = req.body; // 'publish' or 'unpublish'
    
    if (action === 'unpublish') {
      if (!course.isPublished) {
        return res.status(400).json({
          success: false,
          message: 'Course is already unpublished'
        });
      }
      course.isPublished = false;
    } else {
      if (course.isPublished) {
        return res.status(400).json({
          success: false,
          message: 'Course is already published'
        });
      }
      course.isPublished = true;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: `Course ${action === 'unpublish' ? 'unpublished' : 'published'} successfully`,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course publish status',
      error: error.message
    });
  }
};

// @desc    Get course syllabus
// @route   GET /api/courses/:id/syllabus
// @access  Public
export const getCourseSyllabus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .select('title description duration price syllabus');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // For public, only show published and active courses
    if (!req.user || req.user.role !== 'admin') {
      if (!course.isPublished || !course.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        courseId: course._id,
        title: course.title,
        description: course.description,
        duration: course.duration,
        fee: course.price,
        syllabus: course.syllabus || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course syllabus',
      error: error.message
    });
  }
};

// @desc    Update course syllabus
// @route   PUT /api/courses/:id/syllabus
// @access  Private/Admin or Content Writer
export const updateCourseSyllabus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is authorized (admin or the creator)
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course syllabus'
      });
    }

    const { overview, modules, learningOutcomes, prerequisites, projects, certification } = req.body;

    // Initialize syllabus object if it doesn't exist
    if (!course.syllabus) {
      course.syllabus = {
        overview: '',
        modules: [],
        learningOutcomes: [],
        prerequisites: [],
        projects: [],
        certification: ''
      };
    }

    // Update syllabus fields - only update if provided
    if (overview !== undefined) {
      course.syllabus.overview = overview;
    }
    if (modules !== undefined && Array.isArray(modules)) {
      course.syllabus.modules = modules;
    }
    if (learningOutcomes !== undefined && Array.isArray(learningOutcomes)) {
      course.syllabus.learningOutcomes = learningOutcomes;
    }
    if (prerequisites !== undefined && Array.isArray(prerequisites)) {
      course.syllabus.prerequisites = prerequisites;
    }
    if (projects !== undefined && Array.isArray(projects)) {
      course.syllabus.projects = projects;
    }
    if (certification !== undefined) {
      course.syllabus.certification = certification;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course syllabus updated successfully',
      data: course.syllabus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course syllabus',
      error: error.message
    });
  }
};
