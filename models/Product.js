import mongoose from "mongoose";
import { slugify } from "../utils/slug.js";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 160,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                "Slug must be URL-safe",
            ],
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 20,
            maxlength: 5000,
        },

        brand: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            index: true,
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            index: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
            set: (value) =>
                Number(Number(value).toFixed(2)),
        },

        discountPrice: {
            type: Number,
            min: 0,
            set: (value) =>
                value == null
                    ? value
                    : Number(Number(value).toFixed(2)),
        },

        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: "Stock must be a whole number",
            },
        },

        images: {
            type: [
                {
                    type: String,
                    trim: true,
                    match: /^https?:\/\/.+/,
                },
            ],

            validate: [
                (images) =>
                    images.length > 0 && images.length <= 8,

                "Provide between 1 and 8 image URLs",
            ],
        },


        fragranceNotes: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: 60,
                },
            ],

            default: [],

            validate: [
                (notes) =>
                    notes.length <= 12,

                "A product may have at most 12 fragrance notes",
            ],
        },


        volume: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },


        gender: {
            type: String,

            enum: [
                "men",
                "women",
                "unisex",
            ],

            default: "unisex",
            index: true,
        },


        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },


        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },


        featured: {
            type: Boolean,
            default: false,
            index: true,
        },


        bestseller: {
            type: Boolean,
            default: false,
            index: true,
        },

    },

    {
        timestamps: true,

        toJSON: {
            virtuals: true,
        },

        toObject: {
            virtuals: true,
        },
    }
);


// Discount price validation
productSchema.pre("validate", function (next) {

    if (
        this.discountPrice != null &&
        this.discountPrice > this.price
    ) {

        this.invalidate(
            "discountPrice",
            "Discount price cannot exceed regular price"
        );

    }

    next();

});


// Indexes

productSchema.index({
    category: 1,
    featured: -1,
    createdAt: -1,
});


productSchema.index({
    gender: 1,
    price: 1,
});


productSchema.index({
    name: "text",
    brand: "text",
    description: "text",
});


// Virtual fields

productSchema.virtual("effectivePrice")
.get(function () {

    return this.discountPrice ?? this.price;

});


productSchema.virtual("isInStock")
.get(function () {

    return this.stock > 0;

});


productSchema.virtual("reviewItems", {

    ref: "Review",

    localField: "_id",

    foreignField: "product",

});


// Generate slug before saving

productSchema.pre(
    "validate",
    function generateSlug(next) {

        if (
            this.isModified("name") &&
            !this.isModified("slug")
        ) {

            this.slug = slugify(this.name);

        }

        next();

    }
);


// Update slug during update

productSchema.pre(
    "findOneAndUpdate",
    function generateUpdatedSlug(next) {

        const update = this.getUpdate();


        if (
            update?.name &&
            !update.slug
        ) {

            this.setUpdate({

                ...update,

                slug: slugify(update.name),

            });

        }


        next();

    }
);


export default mongoose.model(
    "Product",
    productSchema
);