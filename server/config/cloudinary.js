import { v2 as cloudinary } from 'cloudinary'

import 'dotenv/config';

// console.log("Cloudinary ENV:", {
//   name: process.env.CLOUDINARY_CLOUD_NAME,
//   key: process.env.CLOUDINARY_API_KEY ? "✅ loaded" : "❌ missing",
//   secret: process.env.CLOUDINARY_API_SECRET ? "✅ loaded" : "❌ missing"
// });


const connectCloudinary = async () =>{
    cloudinary.config({
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
        api_key:process.env.CLOUDINARY_API_KEY,
        api_secret:process.env.CLOUDINARY_API_SECRET,

 
    })
}

export default connectCloudinary;