import User from '../models/User.js'; import Product from '../models/Product.js'; import Order from '../models/Order.js'; import Review from '../models/Review.js'; import Coupon from '../models/Coupon.js'; import Banner from '../models/Banner.js';
import { normalizeCouponCode, serializeCoupon } from '../utils/coupon.js';
export const dashboard = async (req, res) => { const [users, products, orders, revenue, recentOrders, reviews] = await Promise.all([User.countDocuments(), Product.countDocuments(), Order.countDocuments(), Order.aggregate([{ $match: { orderStatus: { $ne: 'cancelled' } } }, { $group: { _id: null, value: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } } } }]), Order.find().populate('user', 'name').sort('-createdAt').limit(5), Review.countDocuments()]); res.json({ users, products, orders, reviews, revenue: revenue[0]?.value || 0, recentOrders }); };
export const listUsers = async (req, res) => res.json(await User.find().select('-password').sort('-createdAt'));
export const updateUser = async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password'));

export const listReviews = async (req, res) => {
	const search = String(req.query.search || '').trim();
	const product = String(req.query.product || '').trim();
	const rating = Number(req.query.rating || 0);

	const filters = {
		...(product ? { 'product.slug': product } : {}),
		...(rating ? { rating: { $gte: rating } } : {}),
		...(search
			? {
					$or: [
						{ comment: { $regex: search, $options: 'i' } },
						{ 'user.name': { $regex: search, $options: 'i' } },
						{ 'product.name': { $regex: search, $options: 'i' } },
					],
				}
			: {}),
	};

	const reviews = await Review.aggregate([
		{
			$lookup: {
				from: 'users',
				localField: 'user',
				foreignField: '_id',
				as: 'user',
			},
		},
		{ $unwind: '$user' },
		{
			$lookup: {
				from: 'products',
				localField: 'product',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $unwind: '$product' },
		{ $match: filters },
		{ $sort: { createdAt: -1 } },
		{
			$project: {
				rating: 1,
				comment: 1,
				isApproved: 1,
				createdAt: 1,
				updatedAt: 1,
				user: { _id: '$user._id', name: '$user.name', email: '$user.email' },
				product: { _id: '$product._id', name: '$product.name', slug: '$product.slug' },
			},
		},
	]);

	res.json(reviews);
};

export const updateReviewStatus = async (req, res) => {
	const { status } = req.body;
	if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid review status' });

	const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: status === 'approved' }, { new: true }).populate('user', 'name').populate('product', 'name');
	if (!review) return res.status(404).json({ message: 'Review not found' });
	await Review.refreshProductRating(review.product._id);
	res.json(review);
};

export const deleteReview = async (req, res) => {
	await Review.findByIdAndDelete(req.params.id);
	res.status(204).end();
};
const resourceHandlers = (Model) => ({ list: async (req, res) => res.json(await Model.find().sort('-createdAt')), create: async (req, res) => res.status(201).json(await Model.create(req.body)), update: async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, req.body, { new: true })), remove: async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.status(204).end(); } });
const sanitizeCouponPayload = (body = {}) => ({
	code: normalizeCouponCode(body.code),
	description: String(body.description || '').trim(),
	discountType: body.discountType,
	discountValue: Number(body.discountValue),
	minimumPurchaseAmount: Number(body.minimumPurchaseAmount || 0),
	maximumDiscount: body.maximumDiscount === '' || body.maximumDiscount == null ? null : Number(body.maximumDiscount),
	usageLimit: Number(body.usageLimit),
	usedCount: body.usedCount == null || body.usedCount === '' ? 0 : Number(body.usedCount),
	startDate: body.startDate,
	expiryDate: body.expiryDate,
	isActive: body.isActive === undefined ? true : body.isActive === true || body.isActive === 'true',
});
export const coupons = { list: async (req, res) => {
	const search = String(req.query.search || '').trim();
	const status = String(req.query.status || 'all').trim().toLowerCase();
	const now = new Date();
	const clauses = [];
	if (search) clauses.push({ $or: [{ code: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] });
	if (status === 'active') clauses.push({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now }, $expr: { $lt: ['$usedCount', '$usageLimit'] } });
	if (status === 'inactive') clauses.push({ isActive: false });
	if (status === 'expired') clauses.push({ $or: [{ expiryDate: { $lt: now } }, { $expr: { $gte: ['$usedCount', '$usageLimit'] } }, { startDate: { $gt: now } }] });
	const items = await Coupon.find(clauses.length ? { $and: clauses } : {}).sort('-createdAt');
	res.json(items.map((coupon) => serializeCoupon(coupon, now)));
}, create: async (req, res) => { const coupon = await Coupon.create(sanitizeCouponPayload(req.body)); res.status(201).json(serializeCoupon(coupon)); }, update: async (req, res) => { const coupon = await Coupon.findByIdAndUpdate(req.params.id, sanitizeCouponPayload(req.body), { new: true, runValidators: true }); if (!coupon) return res.status(404).json({ message: 'Coupon not found' }); res.json(serializeCoupon(coupon)); }, remove: async (req, res) => { const coupon = await Coupon.findByIdAndDelete(req.params.id); if (!coupon) return res.status(404).json({ message: 'Coupon not found' }); res.status(204).end(); } };
export const banners = resourceHandlers(Banner);
