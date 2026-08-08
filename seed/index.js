import "dotenv/config";

import { connectDatabase } from "../config/db.js";

import { seedCategories } from "./categories.js";

import { seedProducts } from "./products.js";

import { seedAdmin } from "./admin.js";



const run = async () => {

    try {


        await connectDatabase();



        const categories = await seedCategories();



        const products = await seedProducts();



        const admin = await seedAdmin();



        console.log(
            `Seeded ${categories.length} categories, ${products.length} products, and admin ${admin.email}`
        );



        process.exit(0);



    } catch(error) {


        console.error(
            "Seed failed",
            error
        );


        process.exit(1);

    }

};



run();