import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe'] },
  imageUrl: { type: String, trim: true, match: [/^https?:\/\/.+/, 'Image URL must be absolute'] }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
categorySchema.virtual('products', { ref: 'Product', localField: '_id', foreignField: 'category' });
categorySchema.pre('validate', function generateSlug(next) { if (this.isModified('name') && !this.isModified('slug')) this.slug = slugify(this.name); next(); });
categorySchema.pre('findOneAndUpdate', function generateUpdatedSlug(next) { const update = this.getUpdate(); if (update?.name && !update.slug) this.setUpdate({ ...update, slug: slugify(update.name) }); next(); });
export default mongoose.model('Category', categorySchema);
