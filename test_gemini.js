import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/sama/projects/perfume/backend/.env' });

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const chat = model.startChat({
      history: [
        { role: 'model', parts: [{ text: 'Hello!' }] }
      ]
    });
    
    const result = await chat.sendMessage("Hi!");
    console.log(result.response.text());
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
run();
