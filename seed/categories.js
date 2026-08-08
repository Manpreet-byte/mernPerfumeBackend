import Category from "../models/Category.js";


export const categorySeeds = [
    {
        name: "Luxury",
        slug: "luxury",
        description: "Premium luxury perfumes collection",
    },
    {
        name: "Men",
        slug: "men",
        description: "Perfumes designed for men",
    },
    {
        name: "Women",
        slug: "women",
        description: "Elegant fragrances for women",
    },
    {
        name: "Unisex",
        slug: "unisex",
        description: "Fragrances suitable for everyone",
    },
];


export const seedCategories = async () => {

    const categories = [];


    for (const category of categorySeeds) {

        const document = await Category.findOneAndUpdate(
            {
                slug: category.slug,
            },
            {
                $set: category,
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );


        categories.push(document);
    }


    console.log("Categories seeded");


    return categories;
};