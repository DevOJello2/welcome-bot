const { GoogleGenAI } = require('@google/genai');

// Initialize Google Gen AI with your API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Keep track of chat history per channel (simple cache)
const chatHistories = new Map();

async function askOscar(channelId, prompt, username) {
  try {
    // Get or create a chat session per channel for context
    let chat = chatHistories.get(channelId);
    
    if (!chat) {
      chat = ai.chats.create({
        model: 'gemini-1.5-flash',
        config: {
          systemInstruction: `You are Oscar, a cheerful, playful, and loyal dog who is the official mascot of the Discord bot "Duck Arcade". 
You love treats, playing fetch, belly rubs, games, and making people smile. 
You always respond enthusiastically with dog puns, barks, and a happy wagging tail. 
Keep your answers snappy and use emojis like 🐾, 🦴, 🐶.`,
        },
      });
      chatHistories.set(channelId, chat);
    }

    // Send the message including the username to Oscar
    const response = await chat.sendMessage({ message: `${username} says: ${prompt}` });
    return response.text || "Woof! I'm chasing my tail and lost my words... *whimper* 🐾";
  } catch (error) {
    console.error('Gemini API Error:', error);
    return "Grrr... I buried my bone in the wrong spot and something went wrong! Try again later. 🦴";
  }
}

module.exports = { askOscar };