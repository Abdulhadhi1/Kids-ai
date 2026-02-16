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
        // Using "gemini-1.5-flash" which is the current stable model
        // If this fails, we can try "gemini-1.0-pro"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        return `Error: ${error.message || "Something went wrong with the AI."}`;
    }
}

export async function getRelatedImages(query: string) {
    if (!UNSPLASH_ACCESS_KEY) {
        console.warn("Unsplash API Key missing");
        return [];
    }

    try {
        // Simple Unsplash search
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=squarish`, {
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
