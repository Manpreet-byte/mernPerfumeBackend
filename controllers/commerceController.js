import mongoose from 'mongoose';
import Cart from '../models/Cart.js'; import User from '../models/User.js'; import Order from '../models/Order.js'; import Review from '../models/Review.js'; import Product from '../models/Product.js'; import Coupon from '../models/Coupon.js';
import { normalizeCouponCode, validateCouponEligibility } from '../utils/coupon.js';
export const getCart = async (req, res) => res.json(await Cart.findOne({ user: req.user._id }).populate('items.product'));
export const addCart = async (req, res) => { const { product, quantity = 1 } = req.body; const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id } }, { new: true, upsert: true }); const item = cart.items.find((entry) => entry.product.toString() === product); if (item) item.quantity += quantity; else cart.items.push({ product, quantity }); await cart.save(); res.status(201).json(await cart.populate('items.product')); };
export const updateCart = async (req, res) => { const { quantity } = req.body; const cart = await Cart.findOne({ user: req.user._id }); if (!cart) return res.status(404).json({ message: 'Cart not found' }); const item = cart.items.find((entry) => entry.product.toString() === req.params.id); if (!item) return res.status(404).json({ message: 'Cart item not found' }); item.quantity = Math.max(1, Number(quantity) || 1); await cart.save(); res.json(await cart.populate('items.product')); };
export const removeCart = async (req, res) => { const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $pull: { items: { product: req.params.id } } }, { new: true }).populate('items.product'); res.json(cart); };
export const getWishlist = async (req, res) => res.json((await User.findById(req.user._id).populate('wishlist')).wishlist);
export const addWishlist = async (req, res) => { const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: req.body.product } }, { new: true }).populate('wishlist'); res.json(user.wishlist); };
export const removeWishlist = async (req, res) => { const user = await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: req.params.id } }, { new: true }).populate('wishlist'); res.json(user.wishlist); };
export const getOrders = async (req, res) => {
	const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
	const orders = await Order.find(filter).sort('-createdAt').lean();
	const productIds = [...new Set(orders.flatMap((order) => (order.products || []).map((item) => item?.productId).filter((productId) => mongoose.Types.ObjectId.isValid(productId)).map((productId) => productId.toString())))];
	const products = await Product.find({ _id: { $in: productIds } }).select('name slug images brand price discountPrice').lean();
	const productMap = new Map(products.map((product) => [product._id.toString(), product]));
	const hydratedOrders = orders.map((order) => ({
		...order,
		products: (order.products || []).map((item) => {
			const productId = item?.productId;
			const product = mongoose.Types.ObjectId.isValid(productId) ? productMap.get(productId.toString()) : null;
			return product ? { ...item, productId: product } : null;
		}).filter(Boolean),
	}));
	res.json(hydratedOrders);
};
export const createOrder = async (req, res) => {
	try {
		const { products = [], couponCode, ...rest } = req.body;
		if (!products.length) return res.status(400).json({ message: 'An order requires at least one product' });

		const normalizedProducts = await Promise.all(products.map(async (item) => {
			if (!mongoose.Types.ObjectId.isValid(item.productId)) return null;
			const product = await Product.findById(item.productId);
			if (!product) return null;
			const price = product.discountPrice ?? product.price;
			return { productId: product._id, quantity: Math.max(1, Number(item.quantity) || 1), price };
		}));

		if (normalizedProducts.some((item) => item == null)) {
			return res.status(400).json({ message: 'Your cart contains an outdated product reference. Please refresh your cart and try again.' });
		}

		const subtotal = normalizedProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
		let discountAmount = 0;
		let finalTotal = subtotal;
		const normalizedCoupon = couponCode ? normalizeCouponCode(couponCode) : null;

		if (normalizedCoupon) {
			const coupon = await Coupon.findOne({ code: normalizedCoupon });
			const validation = validateCouponEligibility(coupon, subtotal);
			if (!validation.valid) return res.status(400).json({ message: validation.message });
			discountAmount = validation.discountAmount;
			finalTotal = validation.finalAmount;
		}

		const order = await Order.create({
			...rest,
			products: normalizedProducts,
			user: req.user._id,
			totalAmount: subtotal,
			couponCode: normalizedCoupon,
			discountAmount,
			finalAmount: finalTotal,
		});

		if (normalizedCoupon) await Coupon.updateOne({ code: normalizedCoupon }, { $inc: { usedCount: 1 } });
		res.status(201).json(order);
	} catch (error) {
		res.status(error.statusCode || 500).json({ message: error.message || 'Unable to create order' });
	}
};
export const updateOrder = async (req, res) => res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }));

const hasPurchasedProduct = async (userId, productId) => {
	const order = await Order.findOne({ user: userId, orderStatus: { $in: ['processing', 'shipped', 'delivered'] }, 'products.productId': productId });
	return Boolean(order);
};

export const createReview = async (req, res) => {
	const { productId } = req.params;
	const { rating, comment } = req.body;

	if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid product id' });
	if (!(await hasPurchasedProduct(req.user._id, productId))) return res.status(403).json({ message: 'Only customers who purchased this perfume can review it.' });

	const existing = await Review.findOne({ user: req.user._id, product: productId });
	if (existing) return res.status(409).json({ message: 'You already reviewed this product.' });

	const review = await Review.create({ user: req.user._id, product: productId, rating, comment, isApproved: true });
	const populated = await review.populate('user', 'name');
	res.status(201).json(populated);
};

export const getReviews = async (req, res) => {
	const { productId } = req.params;
	if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid product id' });

	const reviews = await Review.find({ product: productId, isApproved: true }).populate('user', 'name').sort('-createdAt');
	const [summary] = await Review.aggregate([
		{ $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
		{
			$facet: {
				totals: [{ $group: { _id: null, averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }],
				breakdown: [{ $group: { _id: '$rating', count: { $sum: 1 } } }, { $sort: { _id: -1 } }],
			},
		},
	]);

	const breakdownMap = new Map((summary?.breakdown || []).map((item) => [item._id, item.count]));
	const ratingBreakdown = [5, 4, 3, 2, 1].map((value) => ({ rating: value, count: breakdownMap.get(value) || 0 }));

	res.json({
		reviews,
		averageRating: summary?.totals?.[0] ? Number(summary.totals[0].averageRating.toFixed(1)) : 0,
		totalReviews: summary?.totals?.[0]?.totalReviews || 0,
		ratingBreakdown,
	});
};

export const updateReview = async (req, res) => {
	const { reviewId } = req.params;
	const { rating, comment } = req.body;

	const review = await Review.findById(reviewId);
	if (!review) return res.status(404).json({ message: 'Review not found' });
	if (review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can edit only your own reviews.' });

	review.rating = rating;
	review.comment = comment;
	review.isApproved = true;
	await review.save();
	res.json(await review.populate('user', 'name'));
};

export const deleteReview = async (req, res) => {
	const { reviewId } = req.params;
	const review = await Review.findById(reviewId);
	if (!review) return res.status(404).json({ message: 'Review not found' });
	if (review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can delete only your own reviews.' });

	await Review.findByIdAndDelete(reviewId);
	res.status(204).end();
};
