import Payment from '../models/Payment.js';
import { 
  createRazorpayOrder, 
  verifyPaymentSignature, 
  getPaymentDetails,
  processRazorpayRefund 
} from '../utils/razorpay.js';
import crypto from 'crypto';

// @desc    Create a new payment
// @route   POST /api/payments
// @access  Private/All authenticated users
export const createPayment = async (req, res) => {
  try {
    const {
      orderId,
      transactionId,
      amount,
      currency,
      paymentMethod,
      paymentGateway,
      items,
      billingAddress,
      metadata
    } = req.body;

    // Validate required fields
    if (!orderId || !amount || !paymentMethod || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderId, amount, paymentMethod, and items'
      });
    }

    const paymentData = {
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      orderId,
      transactionId,
      amount,
      currency: currency || 'INR',
      paymentMethod,
      paymentGateway: paymentGateway || 'razorpay',
      items,
      billingAddress,
      metadata,
      paymentStatus: 'pending'
    };

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
};

// @desc    Get all payments with filters
// @route   GET /api/payments
// @access  Private/Admin
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      paymentStatus,
      paymentMethod,
      paymentGateway,
      startDate,
      endDate,
      search
    } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (paymentGateway) {
      query.paymentGateway = paymentGateway;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search by order ID, transaction ID, or user email
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate total amount
    const totalAmountResult = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalAmount,
          totalCount: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private/Admin or Payment owner
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized (admin or payment owner)
    if (req.user.role !== 'admin' && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private/Admin or Payment Gateway webhook
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId, receiptUrl, invoiceUrl, notes } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update fields
    if (paymentStatus) {
      payment.paymentStatus = paymentStatus;
    }

    if (transactionId) {
      payment.transactionId = transactionId;
    }

    if (receiptUrl) {
      payment.receiptUrl = receiptUrl;
    }

    if (invoiceUrl) {
      payment.invoiceUrl = invoiceUrl;
    }

    if (notes) {
      payment.notes = notes;
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
};

// @desc    Process refund for a payment
// @route   PUT /api/payments/:id/refund
// @access  Private/Admin
export const processRefund = async (req, res) => {
  try {
    const { refundAmount, refundReason, notes } = req.body;

    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid refund amount'
      });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    if (payment.refundAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been refunded'
      });
    }

    // Check if refund amount exceeds payment amount
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    // Update payment with refund details
    payment.refundAmount = refundAmount;
    payment.refundReason = refundReason || 'Requested refund';
    payment.refundedAt = new Date();
    payment.paymentStatus = 'refunded';
    if (notes) {
      payment.notes = notes;
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
};

// @desc    Get my payments
// @route   GET /api/payments/my-payments/list
// @access  Private/All authenticated users
export const getMyPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, paymentStatus } = req.query;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
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
      message: 'Error fetching your payments',
      error: error.message
    });
  }
};

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Private/All authenticated users
export const createRazorpayOrderHandler = async (req, res) => {
  try {
    const { amount, currency = 'INR', items, billingAddress, metadata } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one item'
      });
    }

    // Generate unique receipt ID
    const receiptId = `receipt_${Date.now()}_${req.user._id}`;

    // Create notes for Razorpay
    const notes = {
      userId: req.user._id.toString(),
      userName: req.user.name,
      userEmail: req.user.email,
      ...metadata
    };

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(
      amount,
      currency,
      receiptId,
      notes
    );

    // Create payment record in database with pending status
    const paymentData = {
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      orderId: razorpayOrder.id,
      amount,
      currency,
      paymentMethod: 'upi', // Default, will be updated after payment
      paymentGateway: 'razorpay',
      items,
      billingAddress,
      metadata,
      paymentStatus: 'pending'
    };

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
          status: razorpayOrder.status,
          keyId: process.env.RAZORPAY_KEY_ID
        },
        payment: {
          id: payment._id,
          orderId: payment.orderId
        }
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/razorpay/verify
// @access  Private/All authenticated users
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderId, paymentId, and signature'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Verify payment belongs to user
    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this payment'
      });
    }

    // Verify signature
    const isSignatureValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isSignatureValid) {
      payment.paymentStatus = 'failed';
      payment.notes = 'Payment verification failed: Invalid signature';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature'
      });
    }

    // Fetch payment details from Razorpay
    const razorpayPayment = await getPaymentDetails(paymentId);

    // Update payment record
    payment.transactionId = paymentId;
    payment.paymentStatus = razorpayPayment.status === 'captured' ? 'completed' : 'processing';
    payment.paymentMethod = razorpayPayment.method || payment.paymentMethod;
    
    if (razorpayPayment.status === 'captured') {
      payment.receiptUrl = razorpayPayment.receipt || null;
      payment.metadata = {
        ...payment.metadata,
        razorpayPayment: {
          method: razorpayPayment.method,
          bank: razorpayPayment.bank,
          wallet: razorpayPayment.wallet,
          vpa: razorpayPayment.vpa,
          email: razorpayPayment.email,
          contact: razorpayPayment.contact
        }
      };
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment: {
          id: payment._id,
          orderId: payment.orderId,
          transactionId: payment.transactionId,
          amount: payment.amount,
          status: payment.paymentStatus,
          paymentMethod: payment.paymentMethod
        }
      }
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// @desc    Razorpay webhook handler
// @route   POST /api/payments/razorpay/webhook
// @access  Public (Razorpay webhook)
export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return res.status(500).json({
        success: false,
        message: 'Webhook secret not configured'
      });
    }

    const signature = req.headers['x-razorpay-signature'];
    
    // Get raw body (Buffer) for signature verification
    const webhookBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // Parse body if it's a Buffer or string
    const event = req.body instanceof Buffer ? JSON.parse(webhookBody) : req.body;

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
};

// Helper function to handle payment captured event
const handlePaymentCaptured = async (paymentEntity) => {
  try {
    const payment = await Payment.findOne({ orderId: paymentEntity.order_id });

    if (payment) {
      payment.transactionId = paymentEntity.id;
      payment.paymentStatus = 'completed';
      payment.paymentMethod = paymentEntity.method || payment.paymentMethod;
      payment.receiptUrl = paymentEntity.receipt || null;
      payment.metadata = {
        ...payment.metadata,
        razorpayPayment: {
          method: paymentEntity.method,
          bank: paymentEntity.bank,
          wallet: paymentEntity.wallet,
          vpa: paymentEntity.vpa,
          email: paymentEntity.email,
          contact: paymentEntity.contact
        }
      };
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
};

// Helper function to handle payment failed event
const handlePaymentFailed = async (paymentEntity) => {
  try {
    const payment = await Payment.findOne({ orderId: paymentEntity.order_id });

    if (payment) {
      payment.transactionId = paymentEntity.id;
      payment.paymentStatus = 'failed';
      payment.notes = paymentEntity.error_description || 'Payment failed';
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

// Helper function to handle order paid event
const handleOrderPaid = async (orderEntity) => {
  try {
    const payment = await Payment.findOne({ orderId: orderEntity.id });

    if (payment && payment.paymentStatus !== 'completed') {
      payment.paymentStatus = 'completed';
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
};

