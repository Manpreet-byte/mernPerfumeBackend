import Coupon from '../models/Coupon.js';
import { calculateCouponDiscount, normalizeCouponCode, serializeCoupon, validateCouponEligibility } from '../utils/coupon.js';

const toCouponPayload = (body = {}) => ({
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

const resolveSubtotal = (body = {}) => Number(body.subtotal ?? body.totalAmount ?? 0);

const handleCouponLookup = async (req, res) => {
	const code = normalizeCouponCode(req.body.code);
	const subtotal = resolveSubtotal(req.body);
	if (!code) return res.status(400).json({ message: 'Coupon code is required' });

	const coupon = await Coupon.findOne({ code });
	const validation = validateCouponEligibility(coupon, subtotal);
	if (!validation.valid) return res.status(400).json({ message: validation.message });

	const calculated = calculateCouponDiscount(coupon, subtotal);
	return res.json({
		message: 'Coupon applied successfully',
		coupon: serializeCoupon(coupon),
		subtotal: Number(subtotal.toFixed(2)),
		...calculated,
	});
};

export const validateCoupon = handleCouponLookup;
export const applyCoupon = handleCouponLookup;

export const listCoupons = async (req, res) => {
	const search = String(req.query.search || '').trim();
	const status = String(req.query.status || 'all').trim().toLowerCase();
	const now = new Date();
	const clauses = [];

	if (search) clauses.push({ $or: [{ code: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] });
	if (status === 'active') clauses.push({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now }, $expr: { $lt: ['$usedCount', '$usageLimit'] } });
	if (status === 'inactive') clauses.push({ isActive: false });
	if (status === 'expired') clauses.push({ $or: [{ expiryDate: { $lt: now } }, { $expr: { $gte: ['$usedCount', '$usageLimit'] } }, { startDate: { $gt: now } }] });

	const coupons = await Coupon.find(clauses.length ? { $and: clauses } : {}).sort({ createdAt: -1 });
	res.json(coupons.map((coupon) => serializeCoupon(coupon, now)));
};

export const createCoupon = async (req, res) => {
	const coupon = await Coupon.create(toCouponPayload(req.body));
	res.status(201).json(serializeCoupon(coupon));
};

export const updateCoupon = async (req, res) => {
	const coupon = await Coupon.findByIdAndUpdate(req.params.id, toCouponPayload(req.body), { new: true, runValidators: true });
	if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
	res.json(serializeCoupon(coupon));
};

export const deleteCoupon = async (req, res) => {
	const coupon = await Coupon.findByIdAndDelete(req.params.id);
	if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
	res.status(204).end();
};
