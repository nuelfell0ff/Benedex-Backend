import { GoogleGenAI } from '@google/genai';
import AiMessage from '../models/AiMessage.js';

// Initialize the Google Gen AI SDK (Make sure GEMINI_API_KEY is in your .env file)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handleSupportChat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id; // Extracted from your auth middleware

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // 1. Fetch recent chat history to maintain conversational memory
    const recentLogs = await AiMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // Reverse history so it's in chronological order for the AI model
    const formattedHistory = recentLogs.reverse().map(log => ({
      role: log.role,
      parts: [{ text: log.message }]
    }));

    // 2. Save the user's incoming message to the database
    await AiMessage.create({ userId, role: 'user', message: message.trim() });

    // 3. Define the strict behavior guidelines for the support agent
    const systemInstruction = `
      You are Lexi AI, the official student support assistant for Adonis College educational platform.
      Your primary purpose is to help students navigate their dashboard, find courses, explain deadlines, 
      and answer academic or platform administration questions professionally, politely, and clearly.
      Keep answers concise and clear. If a request is completely out of scope for student support or involves 
      grading disputes, tell the student to contact their course instructor directly.
    `;

    // 4. Request a response using the lightweight, fast gemini-2.5-flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message.trim() }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    const aiReplyText = response.text || "I'm having trouble formulating a response right now. Please try again.";

    // 5. Commit the AI's reply to the database context
    const savedAiMessage = await AiMessage.create({
      userId,
      role: 'model',
      message: aiReplyText
    });

    return res.status(200).json(savedAiMessage);
  } catch (error) {
    console.error("Gemini support loop engine breakdown:", error);
    return res.status(500).json({ message: "AI Support system connection timed out." });
  }
};

// Optional: Endpoint to let the frontend clear or pull historical logs
export const getSupportHistory = async (req, res) => {
  try {
    const userId = req.user?._id;
    const history = await AiMessage.find({ userId }).sort({ createdAt: 1 }).lean();
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve history" });
  }
};
