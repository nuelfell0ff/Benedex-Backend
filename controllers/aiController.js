import { GoogleGenAI, Type } from '@google/genai';
import AiMessage from '../models/AiMessage.js';
import PaymentTicket from '../models/PaymentTicket.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. Define the structural metadata declaration for the tool
const paymentTicketTool = {
  name: 'createPaymentTicket',
  description: 'Creates an official administrative support ticket when a user provides details about a missing or pending payment issue.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      courseName: { type: Type.STRING, description: 'The title of the course the user paid for.' },
      paymentReference: { type: Type.STRING, description: 'The bank transaction reference, transaction ID, or receipt token code.' },
      paymentTime: { type: Type.STRING, description: 'The estimated time or date when the payment transfer took place.' },
    },
    required: ['courseName', 'paymentReference', 'paymentTime'],
  },
};

export const handleSupportChat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id;

    if (!message || !message.trim()) return res.status(400).json({ message: "Empty message" });

    // Save user's chat message text
    await AiMessage.create({ userId, role: 'user', message: message.trim() });

    // Fetch history logs
    const recentLogs = await AiMessage.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
    const formattedHistory = recentLogs.reverse().map(log => ({
      role: log.role,
      parts: [{ text: log.message }]
    }));

    const systemInstruction = `
      You are Benedex AI, an administrative helper assistant.
      If a user complains about payment issues, politely ask them to provide: The Course Name, the Payment Reference, and the Date/Time.
      Once they supply all three details, you MUST invoke the 'createPaymentTicket' tool immediately.
    `;

    // 2. Call Gemini providing the tool configuration parameters
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message.trim() }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [paymentTicketTool] }]
      }
    });

    // 3. Check if Gemini decided to invoke our payment ticket function call
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      
      if (call.name === 'createPaymentTicket') {
        const { courseName, paymentReference, paymentTime } = call.args;

        // Create the document row directly for the admin panel to read
        await PaymentTicket.create({
          userId,
          courseName,
          paymentReference,
          paymentTime,
          status: 'pending'
        });

        const resolutionMessage = `Thank you! I have compiled your details and forwarded an administrative verification ticket to the Benedex Admin Team. (Reference ID: ${paymentReference}). We will review your transaction logs immediately.`;

        // Save AI response to history track
        const savedAiMessage = await AiMessage.create({ userId, role: 'model', message: resolutionMessage });
        return res.status(200).json(savedAiMessage);
      }
    }

    // Standard conversational reply if no function was triggered
    const aiReplyText = response.text || "Let me check that administrative request for you.";
    const savedAiMessage = await AiMessage.create({ userId, role: 'model', message: aiReplyText });
    return res.status(200).json(savedAiMessage);

  } catch (error) {
    console.error("Critical Function Calling engine exception:", error);
    return res.status(500).json({ message: "Internal Server Processing Error" });
  }
};
