import Product from '../models/Product.js';

const parseNumber = (value) => {
	const num = Number(value);
	return Number.isFinite(num) ? num : undefined;
};

const parseCsv = (value) => {
	if (!value) return [];
	return String(value)
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
};

const resolveSort = (sort, hasSearch) => {
	switch (sort) {
		case 'price_asc':
			return { effectivePrice: 1, createdAt: -1 };
		case 'price_desc':
			return { effectivePrice: -1, createdAt: -1 };
		case 'rating_desc':
			return { rating: -1, totalReviews: -1, createdAt: -1 };
		case 'best_sellers':
			return { bestseller: -1, totalReviews: -1, createdAt: -1 };
		case 'newest':
			return { createdAt: -1 };
		default:
			return hasSearch ? { score: -1, createdAt: -1 } : { createdAt: -1 };
	}
};

export const listProducts = async (req, res) => {
	const search = String(req.query.search || '').trim();
	const category = String(req.query.category || '').trim().toLowerCase();
	const brand = String(req.query.brand || '').trim();
	const gender = String(req.query.gender || '').trim().toLowerCase();
	const fragranceNotes = parseCsv(req.query.fragranceNotes);
	const sort = String(req.query.sort || '').trim();
	const rating = parseNumber(req.query.rating);
	const minPrice = parseNumber(req.query.minPrice);
	const maxPrice = parseNumber(req.query.maxPrice);
	const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 60);
	const skip = (page - 1) * limit;

	const match = {};
	if (search) match.$text = { $search: search };
	if (brand) match.brand = { $regex: brand, $options: 'i' };
	if (gender && ['men', 'women', 'unisex'].includes(gender)) match.gender = gender;
	if (typeof rating === 'number') match.rating = { $gte: rating };
	if (fragranceNotes.length) match.fragranceNotes = { $all: fragranceNotes };

	const pipeline = [
		{ $match: match },
		{
			$addFields: {
				effectivePrice: { $ifNull: ['$discountPrice', '$price'] },
				...(search ? { score: { $meta: 'textScore' } } : {}),
			},
		},
		{
			$lookup: {
				from: 'categories',
				localField: 'category',
				foreignField: '_id',
				as: 'categoryDoc',
			},
		},
		{
			$unwind: {
				path: '$categoryDoc',
				preserveNullAndEmptyArrays: true,
			},
		},
	];

	if (category) {
		pipeline.push({
			$match: {
				$or: [
					{ 'categoryDoc.slug': category },
					{ 'categoryDoc.name': { $regex: `^${category}$`, $options: 'i' } },
				],
			},
		});
	}

	if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
		pipeline.push({
			$match: {
				effectivePrice: {
					...(typeof minPrice === 'number' ? { $gte: minPrice } : {}),
					...(typeof maxPrice === 'number' ? { $lte: maxPrice } : {}),
				},
			},
		});
	}

	const sortStage = resolveSort(sort, Boolean(search));

	pipeline.push({
		$facet: {
			products: [
				{ $sort: sortStage },
				{ $skip: skip },
				{ $limit: limit },
				{
					$project: {
						name: 1,
						slug: 1,
						description: 1,
						brand: 1,
						price: 1,
						discountPrice: 1,
						stock: 1,
						images: 1,
						fragranceNotes: 1,
						volume: 1,
						gender: 1,
						rating: 1,
						totalReviews: 1,
						featured: 1,
						bestseller: 1,
						createdAt: 1,
						category: {
							_id: '$categoryDoc._id',
							name: '$categoryDoc.name',
							slug: '$categoryDoc.slug',
						},
					},
				},
			],
			meta: [{ $count: 'totalProducts' }],
		},
	});

	const [result] = await Product.aggregate(pipeline);
	const products = result?.products || [];
	const totalProducts = result?.meta?.[0]?.totalProducts || 0;
	const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

	res.json({
		products,
		totalProducts,
		currentPage: page,
		totalPages,
		hasNextPage: page < totalPages,
		hasPreviousPage: page > 1,
	});
};
export const getProduct = async (req, res) => { const product = await Product.findById(req.params.id).populate('category'); if (!product) return res.status(404).json({ message: 'Product not found' }); res.json(product); };
export const createProduct = async (req, res) => res.status(201).json(await Product.create(req.body));
export const updateProduct = async (req, res) => { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!product) return res.status(404).json({ message: 'Product not found' }); res.json(product); };
export const deleteProduct = async (req, res) => { const product = await Product.findByIdAndDelete(req.params.id); if (!product) return res.status(404).json({ message: 'Product not found' }); res.status(204).end(); };
