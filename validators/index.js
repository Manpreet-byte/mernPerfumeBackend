import { body, validationResult } from 'express-validator';
export const validate = (rules) => [...rules, (req, res, next) => { const errors = validationResult(req); return errors.isEmpty() ? next() : res.status(422).json({ errors: errors.array() }); }];
export const registerRules = [body('name').trim().isLength({ min: 2, max: 100 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })];
export const loginRules = [body('email').isEmail().normalizeEmail(), body('password').notEmpty()];
export const productRules = [body('name').trim().isLength({ min: 2, max: 160 }), body('description').trim().isLength({ min: 20, max: 5000 }), body('brand').trim().notEmpty(), body('category').isMongoId(), body('price').isFloat({ min: 0 }), body('stock').isInt({ min: 0 }), body('images').isArray({ min: 1, max: 8 }), body('images.*').isURL({ protocols: ['http', 'https'] }), body('volume').trim().notEmpty(), body('gender').optional().isIn(['men', 'women', 'unisex'])];
