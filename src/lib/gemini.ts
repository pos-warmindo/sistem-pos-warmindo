import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Peringatan: GEMINI_API_KEY belum diatur di environment variable (.env.local)");
}

// Inisialisasi GoogleGenAI instance server-side
export const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
