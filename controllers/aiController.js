import { GoogleGenerativeAI } from '@google/generative-ai';

export const handleChat = async (req, res) => {
  try {
    const { messages } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER') {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the backend environment.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "You are a helpful, polite, and sophisticated AI assistant for a fine fragrance and perfume store called AURELIA. Answer customer queries concisely, beautifully, and assist them with their fragrance journey." 
    });
    
    // Gemini chat history must start with a 'user' message.
    // We filter out any initial 'model' greeting messages.
    let startIndex = 0;
    while (startIndex < messages.length && messages[startIndex].role !== 'user') {
      startIndex++;
    }
    
    const historyMessages = messages.slice(startIndex, -1);
    
    const formattedHistory = historyMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    const lastMessage = messages[messages.length - 1].content;
    
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });
  } catch (error) {
    console.error('Error in AI Chat Controller:', error);
    res.status(500).json({ error: 'An error occurred while communicating with the AI service.' });
  }
};
