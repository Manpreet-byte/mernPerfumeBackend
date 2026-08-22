import dotenv from 'dotenv';
dotenv.config({ path: '/home/sama/projects/perfume/backend/.env' });
import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.models) {
      const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("gemini"));
      console.log("Supported Models:", generateModels.map(m => m.name));
    } else {
      console.log("RESPONSE:", data);
    }
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
run();
