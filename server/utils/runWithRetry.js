import { AppError } from "./AppError.js"


//Some models still wrap JSON in ```json ... ``` fences. Remove them if present.

const stripCodesFences = (text) =>
    (text ?? "")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

//getRawText: a function that asks the AI and return its raw text answer
// schema: the zod schema the answer must watch
// attempts: how many times we try before giving up

export const runWithRetry = async (getRawText, SchemaType, attempts = 2) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {


        try {
            const raw = await getRawText();
            const parsed = JSON.parse(stripCodeFences(raw));  //is it valid JSON?
            return schema.parse(parsed)
        } catch (err) {
            console.error(`AI attempt ${attempt} /${attempt}/${attempts} failed:`, err.message);
        }
    }

    throw new AppError(
        "The AI service returned an unexpected response. Please try again.",
        502
    )

}

