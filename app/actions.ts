'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function generateAnswer(question: string) {
    if (!GEMINI_API_KEY) {
        return "I'm sorry, I don't have my brain connected (API Key missing).";
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Using "gemini-pro" as it works best with free API keys on vercel
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `You are a friendly, helpful, and fun teacher for a 3rd-grade student (approx 8-9 years old).
    Explain the following question in a simple, engaging way.
    Use emojis.
    Keep it short (max 5 sentences).
    Use bullet points if helpful.

    Question: "${question}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        // Fallback for demo purposes if API fails often
        if (error.message?.includes('404') || error.message?.includes('not found')) {
            return "I'm having trouble connecting to my Super Brain (Model not found). Try checking your API Key or try again later! 🧠❌";
        }
        return `Oops! My brain is a bit fuzzy. Error: ${error.message || "Unknown error"}`;
    }
}

export async function getRelatedImages(query: string) {
    if (!UNSPLASH_ACCESS_KEY) {
        console.warn("Unsplash API Key missing");
        return [];
    }

    try {
        // IMPROVEMENT: Clean the query to get better images.
        // Remove "who is", "what is", etc. for better search results.
        const cleanQuery = query.replace(/^(who|what|where|when|why|how)\s(is|are|was|were|do|does|did)\s/i, '').trim();
        const searchTerm = cleanQuery || query; // Fallback to original if empty

        console.log(`Searching images for: ${searchTerm}`);

        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=3&orientation=squarish`, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Unsplash error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results.map((img: any) => img.urls.small);
    } catch (error) {
        console.error("Unsplash API Error:", error);
        return [];
    }
}
