import mongoose from 'mongoose';
const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' } },
  price: { type: Number, required: true, min: 0, set: (value) => Number(Number(value).toFixed(2)) }
}, { _id: false });
const shippingAddressSchema = new mongoose.Schema({
  recipient: { type: String, required: true, trim: true, maxlength: 100 }, phone: { type: String, trim: true, maxlength: 30 }, line1: { type: String, required: true, trim: true, maxlength: 150 }, line2: { type: String, trim: true, maxlength: 150 },
  city: { type: String, required: true, trim: true, maxlength: 80 }, state: { type: String, trim: true, maxlength: 80 }, postalCode: { type: String, required: true, trim: true, maxlength: 20 }, country: { type: String, required: true, trim: true, maxlength: 80 }
}, { _id: false });
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  products: { type: [orderProductSchema], required: true, validate: [(products) => products.length > 0, 'An order requires at least one product'] },
  shippingAddress: { type: shippingAddressSchema, required: true },
  paymentMethod: { type: String, required: true, enum: ['cod', 'razorpay'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentProvider: { type: String, enum: ['cod', 'razorpay'], default: 'cod' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  totalAmount: { type: Number, required: true, min: 0, set: (value) => Number(Number(value).toFixed(2)) },
  couponCode: { type: String, trim: true, uppercase: true, default: null },
  discountAmount: { type: Number, default: 0, min: 0, set: (value) => Number(Number(value || 0).toFixed(2)) },
  finalAmount: { type: Number, required: true, min: 0, set: (value) => Number(Number(value).toFixed(2)) },
  orderStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending', index: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
orderSchema.index({ user: 1, createdAt: -1 }); orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.virtual('itemCount').get(function itemCount() { return this.products.reduce((count, item) => count + item.quantity, 0); });
orderSchema.pre('validate', function calculateTotal(next) { if (this.isModified('products') || this.totalAmount == null) this.totalAmount = this.products.reduce((total, item) => total + (item.price * item.quantity), 0); if (this.finalAmount == null) this.finalAmount = Math.max(0, this.totalAmount - (this.discountAmount || 0)); next(); });
export default mongoose.model('Order', orderSchema);
