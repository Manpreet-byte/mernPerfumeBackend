import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => { try { const token = req.headers.authorization?.split(' ')[1]; if (!token) return res.status(401).json({ message: 'Authentication required' }); const decoded = jwt.verify(token, process.env.JWT_SECRET); req.user = await User.findById(decoded.id); if (!req.user) return res.status(401).json({ message: 'User not found' }); next(); } catch { res.status(401).json({ message: 'Invalid session' }); } };
export const adminOnly = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access required' });
