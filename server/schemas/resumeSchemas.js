import { z } from "zod";

// The shape we EXPECT back from the AI for step 1 (analysis)
export const AnalysisSchema = z.object({
  analysis: z.object({
    score: z.number().min(0).max(100),
    points: z.array(z.string()).min(1),
  }),
});


// Sometimes the AI sends a job as an object, e.g.
//   { role: "Developer", company: "ABC", dates: "2022-2024", bullets: ["...", "..."] }
// instead of plain text lines. Our frontend needs plain strings, so we convert:
//   - text values (role, company, dates...) become ONE header line
//   - every item inside a list (bullets...) becomes its own line
const toLines = (item) => {
  if (item === null || item === undefined) return [];
  if (typeof item === "string") return [item];
  if (typeof item === "number" || typeof item === "boolean") return [String(item)];
  if (Array.isArray(item)) return item.flatMap(toLines);

  const values = Object.values(item);
  const header = values
    .filter((v) => typeof v === "string" || typeof v === "number")
    .join(" — ");
  const nested = values
    .filter((v) => typeof v === "object" && v !== null)
    .flatMap(toLines);
  return [header, ...nested].filter(Boolean);
};


// z.preprocess runs our converter FIRST, then checks the result is a list of strings.
const ContentSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value.flatMap(toLines) : value),
  z.array(z.string())
);


// The shape we EXPECT back from the AI for step 2 (improved resume)
// .catch("") means: if name/email/phone is missing or null, use "" instead of failing
export const ImprovedResumeSchema = z.object({
  name: z.string().catch(""),
  email: z.string().catch(""),
  phone: z.string().catch(""),
  sections: z
    .array(
      z.object({
        title: z.string(),
        content: ContentSchema,
      })
    )
    .min(1),
});