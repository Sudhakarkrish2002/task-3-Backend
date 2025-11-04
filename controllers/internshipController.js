import Internship from '../models/Internship.js';

// @desc    Create a new internship
// @route   POST /api/internships
// @access  Private/Employer
export const createInternship = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      isRemote,
      type,
      duration,
      stipend,
      skillsRequired,
      qualifications,
      responsibilities,
      benefits,
      applicationDeadline,
      startDate,
      positionsAvailable,
      category,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !duration || !applicationDeadline || !positionsAvailable || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const internshipData = {
      title,
      description,
      location,
      isRemote: isRemote || false,
      type: type || 'full-time',
      duration,
      stipend: stipend || {},
      skillsRequired: skillsRequired || [],
      qualifications: qualifications || [],
      responsibilities: responsibilities || [],
      benefits: benefits || [],
      applicationDeadline,
      startDate,
      positionsAvailable,
      category,
      tags: tags || [],
      company: req.user._id,
      companyName: req.user.employerDetails?.companyName || req.user.name,
      status: 'draft',
      adminApprovalStatus: 'pending'
    };

    const internship = await Internship.create(internshipData);

    res.status(201).json({
      success: true,
      message: 'Internship created successfully and submitted for admin approval',
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating internship',
      error: error.message
    });
  }
};

// @desc    Update an internship
// @route   PUT /api/internships/:id
// @access  Private/Employer (own internships) or Admin
export const updateInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && internship.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this internship'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'location', 'isRemote', 'type', 'duration',
      'stipend', 'skillsRequired', 'qualifications', 'responsibilities',
      'benefits', 'applicationDeadline', 'startDate', 'positionsAvailable',
      'category', 'tags', 'status', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        internship[field] = req.body[field];
      }
    });

    // Reset approval status if updated by employer
    if (req.user.role === 'employer') {
      internship.adminApprovalStatus = 'pending';
    }

    await internship.save();

    res.status(200).json({
      success: true,
      message: 'Internship updated successfully',
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

// @desc    Get all internships with filters
// @route   GET /api/internships
// @access  Public
export const getAllInternships = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      category,
      isRemote,
      status,
      adminApprovalStatus
    } = req.query;
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    if (isRemote !== undefined) {
      query.isRemote = isRemote === 'true';
    }

    // For public and non-admin users, only show approved and active internships
    if (!req.user || req.user.role !== 'admin') {
      query.adminApprovalStatus = 'approved';
      query.status = 'active';
      query.applicationDeadline = { $gte: new Date() };
    } else {
      if (status) {
        query.status = status;
      }
      if (adminApprovalStatus) {
        query.adminApprovalStatus = adminApprovalStatus;
      }
    }

    const internships = await Internship.find(query)
      .populate('company', 'name email employerDetails.companyName employerDetails.companyWebsite')
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

// @desc    Get internship by ID
// @route   GET /api/internships/:id
// @access  Public
export const getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name email employerDetails');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // For public and non-admin users, only show approved and active internships
    if (!req.user || req.user.role !== 'admin') {
      if (internship.adminApprovalStatus !== 'approved' || internship.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'Internship not found'
        });
      }
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

// @desc    Get internships posted by employer
// @route   GET /api/internships/my-internships/list
// @access  Private/Employer
export const getMyInternships = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, adminApprovalStatus } = req.query;
    const skip = (page - 1) * limit;

    const query = { company: req.user._id };

    if (status) {
      query.status = status;
    }

    if (adminApprovalStatus) {
      query.adminApprovalStatus = adminApprovalStatus;
    }

    const internships = await Internship.find(query)
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
      message: 'Error fetching your internships',
      error: error.message
    });
  }
};

// @desc    Delete an internship
// @route   DELETE /api/internships/:id
// @access  Private/Employer (own internships) or Admin
export const deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && internship.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this internship'
      });
    }

    await internship.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Internship deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting internship',
      error: error.message
    });
  }
};

