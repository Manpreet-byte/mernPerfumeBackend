import mongoose from 'mongoose';
export default mongoose.model('Banner', new mongoose.Schema({ title: String, subtitle: String, imageUrl: String, link: String }, { timestamps: true }));
