import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
	code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 30, index: true, set: (value) => String(value || '').trim().toUpperCase() },
	description: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
	discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
	discountValue: { type: Number, required: true, min: 0.01 },
	minimumPurchaseAmount: { type: Number, default: 0, min: 0 },
	maximumDiscount: { type: Number, min: 0, default: null },
	usageLimit: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Usage limit must be a whole number' } },
	usedCount: { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: 'Used count must be a whole number' } },
	startDate: { type: Date, required: true },
	expiryDate: { type: Date, required: true },
	isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ expiryDate: 1, isActive: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });

couponSchema.pre('validate', function validateCoupon(next) {
	if (this.expiryDate <= this.startDate) return next(new Error('Expiry date must be after start date'));
	if (this.discountType === 'percentage' && this.discountValue > 100) return next(new Error('Percentage discount cannot exceed 100'));
	if (this.maximumDiscount != null && this.maximumDiscount < 0) return next(new Error('Maximum discount must be positive'));
	if (this.usedCount > this.usageLimit) return next(new Error('Used count cannot exceed usage limit'));
	next();
});

export default mongoose.model('Coupon', couponSchema);
