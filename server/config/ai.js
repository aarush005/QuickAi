import OpenAI from "openai"

// One shared AI client for the whole server (talks to OpenRouter)
export const AI = new OpenAI ({
    apiKey:process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});