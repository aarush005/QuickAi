import OpenAI from "openai";
import sql from "../config/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import connectCloudinary from "../config/cloudinary.js";
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs";
import pkg from "../utils/pdfParse.cjs";
import { GoogleGenerativeAI } from "@google/generative-ai";


const AI = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});


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





const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiModel = genAI.getGenerativeModel({
    model: "gpt-5",
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
    },
});






// Article API

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({
                success: false,
                message: "Limit reached. Upgrade to continue."
            });
        }

        const response = await AI.chat.completions.create({
              model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: length,
        });

        // const result = await geminiModel.generateContent(prompt);
        const content =
            response?.choices?.[0]?.message?.content || "";

        // const content = result.response.text();


        await sql`
            INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, ${prompt}, ${content}, 'article')
        `;

        if (plan !== 'premium') {
            await clerkClient.users.updateUser(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1,
                },
            });
        }

        return res.json({ success: true, content });

    } catch (error) {
        console.error("Generate Article Error:", error);
        res.status(500).json({
            success: false,
            message: "AI generation failed",
        });
    }
};









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

    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: "No resume file uploaded",
      });
    }

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is available for premium subscriptions.",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file exceeds 5MB",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);

    if (typeof pdf !== "function") {
      throw new Error("pdf-parse not loaded properly");
    }

    const pdfData = await pdf(dataBuffer);

    const cleanedText = pdfData.text
      .replace(/\n+/g, "\n") 
      .replace(/\s+/g, " ")
      .trim();

    // =========================
    // 🧠 STEP 1: ANALYSIS
    // =========================

    const analysisPrompt = `
You are an ATS resume analyzer.

TASK:
- Give ATS score (0–100)

ATS RULES:
- Start from 100
- Deduct points:
  - missing sections (-10 each)
  - weak bullet points (-5 each)
  - missing keywords (-15)
  - no measurable achievements (-10)

- Provide improvement points
- FIRST point must include missing sections

Return JSON:
{
  "analysis": {
    "score": 0,
    "points": []
  }
}

Resume:
${cleanedText}
`;

    const analysisResult = await AI.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    let analysisText = analysisResult.choices[0].message.content;

    // 🔥 CLEAN JSON
    analysisText = analysisText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const analysisStart = analysisText.indexOf("{");
    const analysisEnd = analysisText.lastIndexOf("}");

    const analysisJSON = JSON.parse(
      analysisText.substring(analysisStart, analysisEnd + 1)
    );

    // =========================
    // 🧠 STEP 2: IMPROVEMENT
    // =========================

const improvePrompt = `
You are an expert resume writer.

IMPORTANT:
You MUST apply ALL improvements below.

IMPROVEMENTS:
${analysisJSON.analysis.points.join("\n")}

RULES:
- Apply every improvement
- Do NOT remove any existing section
- Preserve section order
- Improve bullet points with measurable results
- Add missing sections if mentioned
- Do NOT invent fake experience

Return JSON:
{
  "name": "",
  "email": "",
  "phone": "",
  "sections": [
    {
      "title": "",
      "content": []
    }
  ]
}

Original Resume:
${cleanedText}
`;

    const improvedResult = await AI.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: improvePrompt }],
      temperature: 0.7,
      max_tokens: 3000,
    });

    let improvedText = improvedResult.choices[0].message.content;

    // 🔥 CLEAN JSON
    improvedText = improvedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const impStart = improvedText.indexOf("{");
    const impEnd = improvedText.lastIndexOf("}");

    const improvedJSON = JSON.parse(
      improvedText.substring(impStart, impEnd + 1)
    );

    // =========================
    // 💾 SAVE TO DB
    // =========================

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Resume Review + Improvement', ${JSON.stringify({
        analysis: analysisJSON.analysis,
        resume: improvedJSON,
      })}, 'resume')
    `;

    // =========================
    // 📤 RESPONSE
    // =========================

    
    res.json({
      success: true,
      content: {
        analysis: analysisJSON.analysis,
        resume: improvedJSON,
      },
    });

  } catch (error) {
    console.error("🔥 resumeReview error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};


// Delete a Creation 

export const deleteCreation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    if (!id) {
      return res.json({
        success: false,
        message: "Creation ID is required",
      });
    }

    // 🔒 Only allow owner to delete
    const creation = await sql`
      SELECT * FROM creations WHERE id = ${id}
    `;

    if (!creation.length) {
      return res.json({
        success: false,
        message: "Creation not found",
      });
    }

    if (creation[0].user_id !== userId) {
      return res.json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ Delete
    await sql`
      DELETE FROM creations WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: "Creation deleted successfully",
    });

  } catch (error) {
    console.error("Delete creation error:", error);
    res.json({
      success: false,
      message: "Failed to delete creation",
    });
  }
};



export const toggleLike = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const creation = await sql`
      SELECT * FROM creations WHERE id = ${id}
    `;

    if (!creation.length) {
      return res.json({
        success: false,
        message: "Creation not found",
      });
    }

    // ✅ get existing likes
    let likes = creation[0].likes || [];

    // ✅ normalize
    likes = likes.map(String);

    // ✅ toggle
    if (likes.includes(String(userId))) {
      likes = likes.filter((uid) => uid !== String(userId));
    } else {
      likes.push(String(userId));
    }

    // ✅ convert to postgres array format
    const pgArray = `{${likes.join(",")}}`;

    // ✅ update
    await sql`
      UPDATE creations 
      SET likes = ${pgArray} 
      WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: "Like updated",
    });

  } catch (error) {
    console.error("🔥 LIKE ERROR:", error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};