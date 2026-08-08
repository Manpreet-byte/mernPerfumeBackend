import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

export default router;