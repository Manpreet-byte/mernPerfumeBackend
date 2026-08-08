import Category from '../models/Category.js';
export const listCategories = async (req, res) => res.json(await Category.find().sort('name'));
export const createCategory = async (req, res) => res.status(201).json(await Category.create(req.body));
export const updateCategory = async (req, res) => { const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!category) return res.status(404).json({ message: 'Category not found' }); res.json(category); };
export const deleteCategory = async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.status(204).end(); };
