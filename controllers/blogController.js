import Blog from '../models/Blog.js';

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin or Content Writer
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      category,
      tags,
      seoTitle,
      seoDescription,
      isFeatured,
      status
    } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, content, and category'
      });
    }

    // Validate status
    const validStatuses = ['draft', 'submitted', 'approved', 'published', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Only admin can set status to published directly
    let blogStatus = status || 'draft';
    if (blogStatus === 'published' && req.user.role !== 'admin') {
      blogStatus = 'draft';
    }

    const blogData = {
      title,
      content,
      excerpt,
      featuredImage,
      category,
      tags,
      seoTitle,
      seoDescription,
      isFeatured,
      status: blogStatus,
      author: req.user._id,
      authorName: req.user.name
    };

    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating blog post',
      error: error.message
    });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin or Content Writer (own posts)
export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if user is authorized (admin or the author)
    if (req.user.role !== 'admin' && blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this blog post'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'content', 'excerpt', 'featuredImage', 'category',
      'tags', 'seoTitle', 'seoDescription', 'isFeatured', 'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    });

    // Only admin can set status to published directly
    if (blog.status === 'published' && req.user.role !== 'admin') {
      blog.status = 'submitted';
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog post',
      error: error.message
    });
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin or Content Writer (own posts)
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if user is authorized (admin or the author)
    if (req.user.role !== 'admin' && blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blog post'
      });
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog post',
      error: error.message
    });
  }
};

// @desc    Get all blog posts with filters
// @route   GET /api/blogs
// @access  Public
export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status, isFeatured } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    // For public and non-admin users, only show published blogs
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    } else if (status) {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .select('-content')
      .sort({ publishedDate: -1, createdAt: -1 })
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
      message: 'Error fetching blog posts',
      error: error.message
    });
  }
};

// @desc    Get blog post by ID or slug
// @route   GET /api/blogs/:id
// @access  Public
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID or slug
    const blog = await Blog.findOne({
      $or: [
        { _id: id },
        { slug: id }
      ]
    }).populate('author', 'name email role');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // For public and non-admin users, only show published blogs
    if (!req.user || req.user.role !== 'admin') {
      if (blog.status !== 'published') {
        return res.status(404).json({
          success: false,
          message: 'Blog post not found'
        });
      }
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog post',
      error: error.message
    });
  }
};

// @desc    Get blog posts by content writer
// @route   GET /api/blogs/my-posts
// @access  Private/Admin or Content Writer
export const getMyBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { author: req.user._id };

    if (status) {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .select('-content')
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
      message: 'Error fetching your blog posts',
      error: error.message
    });
  }
};

// @desc    Submit blog for review
// @route   PUT /api/blogs/:id/submit
// @access  Private/Admin or Content Writer (own posts)
export const submitBlogForReview = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if user is authorized (admin or the author)
    if (req.user.role !== 'admin' && blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this blog post'
      });
    }

    if (blog.status === 'submitted' || blog.status === 'published') {
      return res.status(400).json({
        success: false,
        message: `Blog is already ${blog.status}`
      });
    }

    blog.status = 'submitted';
    await blog.save();

    res.status(200).json({
      success: true,
      message: 'Blog post submitted for review successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting blog post',
      error: error.message
    });
  }
};
