import Workshop from '../models/Workshop.js';

// @desc    Create a new workshop
// @route   POST /api/workshops
// @access  Private/Admin
export const createWorkshop = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      instructor,
      instructorEmail,
      instructorBio,
      price,
      duration,
      level,
      language,
      mode,
      location,
      thumbnail,
      schedule,
      resources,
      maxParticipants,
      learningOutcomes,
      prerequisites,
      tags,
      certificateIncluded
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !instructor || !price || !duration || !maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, instructor, price, duration, and maxParticipants'
      });
    }

    // Validate schedule
    if (!schedule || !schedule.startDate || !schedule.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide workshop schedule with startDate and endDate'
      });
    }

    // Validate location for offline/hybrid modes
    if (mode && (mode === 'offline' || mode === 'hybrid') && !location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required for offline and hybrid workshops'
      });
    }

    const workshopData = {
      title,
      description,
      shortDescription,
      category,
      instructor,
      instructorEmail,
      instructorBio,
      price,
      duration,
      level,
      language,
      mode,
      location,
      thumbnail,
      schedule,
      resources: resources || [],
      maxParticipants,
      learningOutcomes: learningOutcomes || [],
      prerequisites: prerequisites || [],
      tags: tags || [],
      certificateIncluded: certificateIncluded || false,
      createdBy: req.user._id
    };

    const workshop = await Workshop.create(workshopData);

    res.status(201).json({
      success: true,
      message: 'Workshop created successfully',
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating workshop',
      error: error.message
    });
  }
};

// @desc    Update a workshop
// @route   PUT /api/workshops/:id
// @access  Private/Admin
export const updateWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'shortDescription', 'category', 'instructor',
      'instructorEmail', 'instructorBio', 'price', 'duration', 'level',
      'language', 'mode', 'location', 'thumbnail', 'schedule', 'resources',
      'maxParticipants', 'learningOutcomes', 'prerequisites', 'tags',
      'certificateIncluded', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        workshop[field] = req.body[field];
      }
    });

    await workshop.save();

    res.status(200).json({
      success: true,
      message: 'Workshop updated successfully',
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating workshop',
      error: error.message
    });
  }
};

// @desc    Delete a workshop
// @route   DELETE /api/workshops/:id
// @access  Private/Admin
export const deleteWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }

    await workshop.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Workshop deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting workshop',
      error: error.message
    });
  }
};

// @desc    Get all workshops with filters
// @route   GET /api/workshops
// @access  Public
export const getAllWorkshops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      level,
      mode,
      certificateIncluded
    } = req.query;
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

    if (mode) {
      query.mode = mode;
    }

    if (certificateIncluded !== undefined) {
      query.certificateIncluded = certificateIncluded === 'true';
    }

    // For public, only show published workshops
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
      // Only show upcoming workshops
      query['schedule.startDate'] = { $gte: new Date() };
    }

    const workshops = await Workshop.find(query)
      .populate('createdBy', 'name email')
      .sort({ 'schedule.startDate': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Workshop.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        workshops,
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
      message: 'Error fetching workshops',
      error: error.message
    });
  }
};

// @desc    Get workshop by ID
// @route   GET /api/workshops/:id
// @access  Public
export const getWorkshopById = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }

    // For public, only show published and active workshops
    if (!req.user || req.user.role !== 'admin') {
      if (!workshop.isPublished || !workshop.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workshop not found'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workshop',
      error: error.message
    });
  }
};

// @desc    Publish a workshop
// @route   PUT /api/workshops/:id/publish
// @access  Private/Admin
export const publishWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }

    if (workshop.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Workshop is already published'
      });
    }

    workshop.isPublished = true;
    await workshop.save();

    res.status(200).json({
      success: true,
      message: 'Workshop published successfully',
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing workshop',
      error: error.message
    });
  }
};

