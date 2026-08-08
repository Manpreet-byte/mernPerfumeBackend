import mongoose from 'mongoose';
export default mongoose.model('Cart', new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true }, items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, quantity: { type: Number, default: 1 } }] }, { timestamps: true }));
