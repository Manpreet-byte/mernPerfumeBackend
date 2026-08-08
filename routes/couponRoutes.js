import { Router } from 'express';
import { applyCoupon, validateCoupon } from '../controllers/couponController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/validate', validateCoupon);
router.post('/apply', applyCoupon);

export default router;
