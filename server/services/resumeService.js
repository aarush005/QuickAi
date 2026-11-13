import fs from "fs/promises";
import { AI } from "../config/ai.js";
import { extractPdfText } from "../utils/pdfExtractor.js";
import { runWithRetry } from "../utils/runWithRetry.js";
import { AppError } from "../utils/AppError.js";
import { AnalysisSchema, ImprovedResumeSchema } from "../schemas/resumeSchemas.js";
import { saveCreation } from "../repositories/creationRepository.js";




const MODEL = "openai/gpt-4o-mini";


/// --------------------------------------------- PROMPTS --------------------------------------------///

const buildAnalysisPrompt = (resumeText) => `
You are an ATS resume analyzer.

TASK:
-Give ATS score (0-100)

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
${resumeText}
`;

const buildImprovePrompt = (resumeText, points) => `
You are an expert resume writer.

IMPORTANT:
You MUST apply ALL improvements below.

IMPROVEMENTS:
${points.join("\n")}

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
${resumeText}

`;

// ----------------------- One call to the AI------------------//

const askAI = async (prompt, maxTokens) => {
    const result = await AI.chat.completions.create({
        model: MODEL,
        message: [{role: "user", content: prompt}],
        temperature: 0.3,
        max_token: maxTokens,
        response_format: {type: "json_object"},  // ask the AI for valid JSON
    });
    return result.choices[0].message.content;
};



//--------------------The whole feature ----------------------//

export const review = async ({ file, userId, plan }) => {
  try {
    if (plan !== "premium") {
      throw new AppError("This feature is available for premium subscriptions.", 403);
    }

    const resumeText = await extractPdfText(file.path);

    const {analysis } = await runWithRetry(
        () => askAI(buildAnalysisPrompt(resumeText),1500),
        AnalysisSchema
    );

    const resume = await runWithRetry(
        () => askAI(buildAnalysisPrompt(resumeText,analysis.points), 3000),
        ImprovedResumeSchema
    )

    await saveCreation({
        userId,
        prompt: "Resume Review + Improvement",
        content: JSON.stringify({analysis,resume}), //stays a String (ADR 001)
        type: "resume",

    });

    return { analysis, resume};
}finally{

    // Runs on success AND on every error above the uploaded temp file is always deleted.
    await fs.unlink(file.path).catch(() => {});
}
}
