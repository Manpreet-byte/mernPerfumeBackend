const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

export const normalizeCouponCode = (value) => String(value || '').trim().toUpperCase();

export const getCouponStatus = (coupon, referenceDate = new Date()) => {
	if (!coupon?.isActive) return 'inactive';
	if (coupon.startDate && coupon.startDate > referenceDate) return 'scheduled';
	if (coupon.expiryDate && coupon.expiryDate < referenceDate) return 'expired';
	if (Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0)) return 'expired';
	return 'active';
};

export const calculateCouponDiscount = (coupon, subtotal) => {
	const baseAmount = Math.max(0, Number(subtotal) || 0);
	if (!coupon || baseAmount <= 0) return { discountAmount: 0, finalAmount: roundMoney(baseAmount) };

	let discountAmount = 0;
	if (coupon.discountType === 'percentage') discountAmount = (baseAmount * Number(coupon.discountValue || 0)) / 100;
	else discountAmount = Number(coupon.discountValue || 0);

	if (coupon.maximumDiscount != null) discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
	discountAmount = Math.min(discountAmount, baseAmount);
	discountAmount = roundMoney(discountAmount);

	return { discountAmount, finalAmount: roundMoney(baseAmount - discountAmount) };
};

export const validateCouponEligibility = (coupon, subtotal, referenceDate = new Date()) => {
	if (!coupon) return { valid: false, message: 'Coupon not found' };

	const status = getCouponStatus(coupon, referenceDate);
	if (status === 'inactive') return { valid: false, message: 'Coupon is inactive' };
	if (status === 'scheduled') return { valid: false, message: 'Coupon is not active yet' };
	if (status === 'expired') return { valid: false, message: 'Coupon is expired or usage limit reached' };

	const baseAmount = Math.max(0, Number(subtotal) || 0);
	if (baseAmount < Number(coupon.minimumPurchaseAmount || 0)) {
		return { valid: false, message: `Minimum purchase amount of ₹${Number(coupon.minimumPurchaseAmount || 0).toFixed(2)} is required` };
	}

	return { valid: true, status, ...calculateCouponDiscount(coupon, baseAmount) };
};

export const serializeCoupon = (coupon, referenceDate = new Date()) => ({
	id: String(coupon._id),
	_id: String(coupon._id),
	code: coupon.code,
	description: coupon.description,
	discountType: coupon.discountType,
	discountValue: coupon.discountValue,
	minimumPurchaseAmount: coupon.minimumPurchaseAmount,
	maximumDiscount: coupon.maximumDiscount,
	usageLimit: coupon.usageLimit,
	usedCount: coupon.usedCount,
	startDate: coupon.startDate,
	expiryDate: coupon.expiryDate,
	isActive: coupon.isActive,
	status: getCouponStatus(coupon, referenceDate),
	createdAt: coupon.createdAt,
	updatedAt: coupon.updatedAt,
});
