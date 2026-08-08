import { Router } from 'express';
import {
	register,
	login,
	profile,
	googleStart,
	googleCallback,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate, registerRules, loginRules } from '../validators/index.js';

const router = Router();

router.post('/register', validate(registerRules), register);
router.post('/login', validate(loginRules), login);
router.get('/profile', protect, profile);
router.get('/google', googleStart);
router.get('/google/callback', googleCallback);

export default router;
