import { AppError } from "./AppError.js";

// Some models still wrap JSON in ```json ... ``` fences. Remove them if present.
const stripCodeFences = (text) =>
    (text ?? "")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

// getRawText: a function that asks the AI and returns its raw text answer
// schema:     the Zod schema the answer must match
// attempts:   how many times we try before giving up
export const runWithRetry = async (getRawText, schema, attempts = 2) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        let raw;
        try {
            raw = await getRawText();
            const parsed = JSON.parse(stripCodeFences(raw)); // is it valid JSON?
            return schema.parse(parsed);                     // does it have the right shape?
        } catch (err) {
            console.error(`AI attempt ${attempt}/${attempts} failed:`, err.message);
            console.error("RAW AI ANSWER (temporary):", String(raw).slice(0, 1500));

        }
    }
    throw new AppError(
        "The AI service returned an unexpected response. Please try again.",
        502
    );
};