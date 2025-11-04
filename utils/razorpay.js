import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialization of Razorpay instance
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
};

// Create Razorpay order
export const createRazorpayOrder = async (amount, currency = 'INR', receipt = null, notes = {}) => {
  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise (smallest currency unit)
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes,
    };

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    throw new Error(`Error creating Razorpay order: ${error.message}`);
  }
};

// Verify Razorpay payment signature
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    throw new Error(`Error verifying payment signature: ${error.message}`);
  }
};

// Fetch payment details from Razorpay
export const getPaymentDetails = async (paymentId) => {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    throw new Error(`Error fetching payment details: ${error.message}`);
  }
};

// Process refund
export const processRazorpayRefund = async (paymentId, amount = null, notes = {}) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {};
    if (amount) {
      options.amount = amount * 100; // Convert to paise
    }
    if (Object.keys(notes).length > 0) {
      options.notes = notes;
    }

    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    throw new Error(`Error processing refund: ${error.message}`);
  }
};

