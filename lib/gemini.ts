/**
 * Gemini AI Service
 * 
 * Singleton client for Gemini API with safety settings.
 * IMPORTANT: This should ONLY be used server-side (API routes).
 * Never expose Gemini API key in client-side code.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Safety Settings (Production-ready)
 * Blocks medium and above harmful content
 */
export const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

/**
 * Generation Config
 */
export const generationConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
};

/**
 * Main Gemini Model (gemini-1.5-pro)
 * Use for chat and function calling
 */
export const model: GenerativeModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    safetySettings,
    generationConfig,
});

/**
 * Embedding Model (for RAG)
 * Use for generating embeddings of text
 */
export const embeddingModel = genAI.getGenerativeModel({
    model: 'gemini-embedding-001',
});

/**
 * Helper: Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Helper: Check if response was blocked by safety
 */
export function isBlocked(response: any): boolean {
    return response.promptFeedback?.blockReason !== undefined;
}

/**
 * Helper: Get block reason
 */
export function getBlockReason(response: any): string | null {
    return response.promptFeedback?.blockReason || null;
}
