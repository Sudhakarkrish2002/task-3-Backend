# Razorpay Payment Integration Setup Guide

This document provides instructions for setting up and using Razorpay payment integration in the Kiwisedutech platform.

## Backend Setup

### 1. Environment Variables

Add the following variables to your `.env` file (use `env.example` as reference):

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 2. Get Razorpay Credentials

1. Sign up/Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate Test/Live API keys
4. Copy `Key ID` and `Key Secret`
5. For webhook secret:
   - Go to Settings → Webhooks
   - Create a webhook endpoint: `https://yourdomain.com/api/payments/razorpay/webhook`
   - Copy the webhook secret

### 3. Install Dependencies

Dependencies are already installed. If needed, run:
```bash
cd server
npm install razorpay
```

## Frontend Setup

### 1. Environment Variables (Optional)

If your backend is on a different URL, create a `.env` file in the `client` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Endpoints

### Backend Endpoints

1. **Create Razorpay Order**
   - `POST /api/payments/razorpay/create-order`
   - Requires authentication
   - Body: `{ amount, currency, items, billingAddress, metadata }`

2. **Verify Payment**
   - `POST /api/payments/razorpay/verify`
   - Requires authentication
   - Body: `{ orderId, paymentId, signature }`

3. **Webhook Handler**
   - `POST /api/payments/razorpay/webhook`
   - Public endpoint (no authentication)
   - Handles Razorpay webhook events automatically

## Usage Example

### Frontend Usage

```javascript
import { processRazorpayPayment } from '../utils/razorpay.js';

// Process payment
await processRazorpayPayment({
  amount: 999, // Amount in rupees
  currency: 'INR',
  items: [{
    itemType: 'membership',
    itemId: 'basic',
    itemName: 'Basic Membership',
    quantity: 1,
    price: 999
  }],
  billingAddress: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210'
  },
  metadata: {
    // Additional data
  },
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210'
  },
  onSuccess: (paymentData) => {
    console.log('Payment successful:', paymentData);
  },
  onError: (error) => {
    console.error('Payment failed:', error);
  }
});
```

## Payment Flow

1. User initiates payment on frontend
2. Frontend calls `/api/payments/razorpay/create-order` to create order
3. Backend creates Razorpay order and payment record (status: pending)
4. Frontend opens Razorpay checkout modal
5. User completes payment on Razorpay
6. Frontend calls `/api/payments/razorpay/verify` to verify payment
7. Backend verifies signature and updates payment status
8. Razorpay sends webhook (optional, for reliability)
9. Webhook handler updates payment status if needed

## Payment Status

- `pending`: Order created, payment not initiated
- `processing`: Payment initiated, waiting for confirmation
- `completed`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment refunded
- `cancelled`: Payment cancelled

## Testing

### Test Mode

1. Use Razorpay test credentials
2. Test cards:
   - Success: `4111111111111111`
   - Failure: `4000000000000002`
   - CVV: Any 3 digits
   - Expiry: Any future date

### Production Mode

1. Switch to live credentials in Razorpay dashboard
2. Update environment variables with live keys
3. Configure webhook URL in Razorpay dashboard
4. Test webhook using Razorpay webhook tester

## Security Notes

1. **Never expose Key Secret** on frontend
2. Always verify payment signature on backend
3. Use HTTPS in production
4. Validate webhook signatures
5. Store sensitive data securely

## Troubleshooting

### Payment Not Processing

1. Check Razorpay keys in environment variables
2. Verify network connectivity
3. Check browser console for errors
4. Verify Razorpay script is loaded

### Webhook Not Working

1. Check webhook URL is accessible
2. Verify webhook secret matches
3. Check server logs for errors
4. Test webhook using Razorpay dashboard

### Signature Verification Failed

1. Ensure webhook uses raw body (already configured)
2. Verify webhook secret is correct
3. Check if webhook body is being modified

## Support

For Razorpay API documentation, visit: https://razorpay.com/docs/

