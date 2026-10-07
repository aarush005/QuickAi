import { z } from "zod"

// The shape we EXPECT back from the AI for step 1 (analysis)
export const AnalysisSchemas = z.object({
    analysis: z.object({
        score: z.number().min(0).max(100),
        points: z.array(z.string()).min(1),
    }),
});


// The shape we expect back from the AI for step 2 (improved resume)
// .catch("") means: if name/email/phone is missing or null, use "" instead of failing

export const ImprovedResumeSchema = z.object({
    name:z.string().catch(""),
    email: z.string().catch(""),
    phone: z.string().catch(""),
    sections: z 
    .array(
        z.object({
            title: z.string(),
            content: z.array(z.string()),
        })
    )
    .min(1)
})