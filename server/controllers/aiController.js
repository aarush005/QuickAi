import OpenAI from "openai";
import sql from "../config/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import connectCloudinary from "../config/cloudinary.js";
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs";
import pkg from "../utils/pdfParse.cjs";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// 🧠 Load pdf-parse through require to bypass ESM export issues
const pdfModule = require("pdf-parse");

// Force-detect the real function
const pdf = typeof pdfModule === "function"
    ? pdfModule
    : (pdfModule.default || pdfModule["module.exports"]);

console.log("✅ pdf-parse resolved type:", typeof pdf);


// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
// const pdf = require("pdf-parse");
// export default defineComponent({
//     async run({ steps, $ }) {
//         const filePath = "/tmp/" + steps.download_file.$return_value.name;
//         const pdfData = await readFile(filePath);
//         const parsedData = await pdfParse(pdfData);
//         console.log("Parsed PDF data:", parsedData);
//     },
// });







const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});



// Article API

export const generateArticle = async (req, res) => {
    try {

        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: length,
        });

        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUser(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })

        console.error("PDF Parsing Error:", error);
        res.status(500).json({ message: "Failed to parse PDF." });
    }
}




// Blog API

export const generateBlogTitle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." })
        }


        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUser(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}




// Image API

export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;


        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is available for premium subscriptions." })
        }

        await connectCloudinary();

        const formData = new FormData()
        formData.append('prompt', prompt)
        const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
            headers: {
                'x-api-key': process.env.CLIPDROP_API_KEY,
            },
            responseType: "arraybuffer",

        })

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const { secure_url } = await cloudinary.uploader.upload(base64Image)

        await sql` INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${secure_url}, 'image',
 ${publish ?? false})`;

        res.json({ success: true, content: secure_url })

    } catch (error) {
        console.log(error.message)
        let message = error.message;
        res.json({ success: false, message: error.message })
    }
}





// Remove Image API
export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const image = req.file;
        const plan = req.plan;


        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is available for premium subscriptions." })
        }


        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: 'background_removal',
                    background_removal: 'remove_the_background'
                }
            ]
        })

        await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`;

        res.json({ success: true, content: secure_url })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}




// Object Remove API

export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const image = req.file;
        const plan = req.plan;


        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is available for premium subscriptions." })
        }


        const { public_id } = await cloudinary.uploader.upload(image.path)

        const cleanObject = object.trim().replace(/\s+/g, '_');

        const imageUrl = cloudinary.url(public_id, {
            transformation: [
                { effect: `gen_remove:${cleanObject}` }
            ],
            resource_type: 'image'
        });

        await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

        res.json({ success: true, content: imageUrl })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}




// Review Resume API
export const resumeReview = async (req, res) => {
    try {
        console.log("🟢 resumeReview called");
        console.log("req.file:", req.file);
        console.log("req.plan:", req.plan);

        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is available for premium subscriptions." })
        }

        if(resume.size > 5 * 1024 * 1024){
            return res.json({success:false, message: "Resume file size exceeds allowed size is 5MB"})
        }

        if (!resume) {
            console.log("❌ No file received");
            return res.status(400).json({ success: false, message: "No resume file uploaded" });
        }

        const dataBuffer = fs.readFileSync(resume.path);
        console.log("✅ File read successfully");

        ///////////////////////////////////////////////////////////////////////////////new code
        const pdfData = await pdf(dataBuffer);
        console.log("✅ PDF parsed successfully. Length:", pdfData.text.length);


        if (typeof pdf !== "function") {
            throw new Error("pdf-parse function not loaded correctly");
        }
        ////////////////////////////////////////////////////


        // fs.unlinkSync(req.file.path);
        // console.log("🧹 Temp file deleted");

        const prompt = `Review the following resume and provide constructive feedback on its strengths, weakness, and areas for improvement. Resume Content: \n\n${pdfData.text}`

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content
        await sql` INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId},'Review the uploaded resume', ${content}, 'resume-review')`;


        res.json({
            success: true,
            content,
            message: "PDF parsed successfully",
            text: pdfData.text.slice(0, 500)
        });

    } catch (error) {
        console.error("🔥 Error in resumeReview:", error);
        res.status(500).json({ success: false, message: error.message });
    }

};
