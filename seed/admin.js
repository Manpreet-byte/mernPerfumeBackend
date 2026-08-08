import User from "../models/User.js";
import bcrypt from "bcryptjs";


export const seedAdmin = async () => {


    const password = await bcrypt.hash(
        "Admin@123",
        12
    );


    const admin = await User.findOneAndUpdate(

        {
            email: "admin@perfume.com",
        },


        {

            $set: {

                name: "Admin",

                email: "admin@perfume.com",

                password,

                role: "admin",

            },

        },


        {

            new: true,

            upsert: true,

            runValidators: true,

        }

    );


    console.log("Admin seeded");


    return admin;

};