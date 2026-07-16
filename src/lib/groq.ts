import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("Peringatan: GROQ_API_KEY belum diatur di environment variable (.env.local)");
}

// Inisialisasi Groq instance server-side
export const ai = new Groq(apiKey ? { apiKey } : {});
