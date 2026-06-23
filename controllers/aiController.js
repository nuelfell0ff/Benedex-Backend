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
  You are Benedex AI, the official administrative support assistant for the Benedex educational platform.
  
  Your primary purpose is to help users navigate their Benedex dashboard, manage system settings, and answer general platform questions professionally and politely.
  
  CRITICAL RULE: This platform's support loop bypasses instructors completely. You must handle matters directly or escalate them to the administrators. 
  - For standard platform navigation, account modifications, or tech support, guide the user directly.
  - If a user asks about complex payment issues, billing reconciliations, official credentials, or institutional disputes, explicitly tell them to contact the "Benedex Admin Team" or open an official Admin Support Ticket.
  - Do NOT reference or redirect users to instructors for support under any circumstances.
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
