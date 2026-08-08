import mongoose from 'mongoose';
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: 'Rating must be a whole number' } }, comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 1500 }, isApproved: { type: Boolean, default: true, index: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); reviewSchema.index({ product: 1, createdAt: -1 }); reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 }); reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.pre('save', function normalizeComment(next) { this.comment = this.comment.replace(/\s+/g, ' ').trim(); next(); });
reviewSchema.statics.refreshProductRating = async function refreshProductRating(productId) { const [summary] = await this.aggregate([{ $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } }, { $group: { _id: '$product', rating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }]); await mongoose.model('Product').findByIdAndUpdate(productId, { rating: summary ? Number(summary.rating.toFixed(1)) : 0, totalReviews: summary?.totalReviews || 0 }); };
reviewSchema.post('save', function updateProductRating(review) { return review.constructor.refreshProductRating(review.product); });
reviewSchema.post('findOneAndDelete', function updateProductRating(review) { return review ? review.constructor.refreshProductRating(review.product) : null; });
export default mongoose.model('Review', reviewSchema);
