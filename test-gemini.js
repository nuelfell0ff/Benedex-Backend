import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testKey() {
  console.log("Checking API Key:", process.env.BENEDEX_AI_API_KEY ? "EXISTS" : "MISSING");
  try {
    const genAI = new GoogleGenerativeAI(process.env.BENEDEX_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, respond with SUCCESS!");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("Test Failed:", err.message);
  }
}

testKey();