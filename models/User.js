import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 30, default: 'Home' },
  recipient: { type: String, trim: true, required: true, maxlength: 100 },
  line1: { type: String, trim: true, required: true, maxlength: 150 },
  line2: { type: String, trim: true, maxlength: 150 },
  city: { type: String, trim: true, required: true, maxlength: 80 },
  state: { type: String, trim: true, maxlength: 80 },
  postalCode: { type: String, trim: true, required: true, maxlength: 20 },
  country: { type: String, trim: true, required: true, maxlength: 80 },
  isDefault: { type: Boolean, default: false }
}, { _id: true });
const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'] },
  password: {
    type: String,
    required: function requiredPassword() {
      return this.authProvider !== 'google';
    },
    minlength: 8,
    select: false
  },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  phone: { type: String, trim: true, match: [/^[+\d()\s-]*$/, 'Enter a valid phone number'] },
  addresses: { type: [addressSchema], default: [] },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
userSchema.index({ wishlist: 1 });
userSchema.virtual('orderCount', { ref: 'Order', localField: '_id', foreignField: 'user', count: true });
userSchema.pre('save', async function save(next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchesPassword = function matchesPassword(value) {
  if (!this.password) return false;
  return bcrypt.compare(value, this.password);
};
export default mongoose.model('User', userSchema);
