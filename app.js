import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { cart, wishlist, orders, reviews } from './routes/commerceRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Robust CORS setup: read comma-separated CLIENT_URL from env, allow listed origins,
// allow non-browser tools (no Origin) and respond correctly to preflight requests.
const rawClient = process.env.CLIENT_URL || '*';
const allowedOrigins = rawClient.split(',').map((s) => s.trim()).filter(Boolean);

const corsOptions = {
	origin(origin, callback) {
		// Allow requests with no origin (e.g., mobile apps, curl, Postman)
		if (!origin) return callback(null, true);

		if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		return callback(new Error('CORS origin not allowed'));
	},
	credentials: true,
	methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cart);
app.use('/api/wishlist', wishlist);
app.use('/api/orders', orders);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviews);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
