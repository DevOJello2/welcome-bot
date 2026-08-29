const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const chatHistories = new Map();

async function askOscar(channelId, prompt, username) {
  try {
    let history = chatHistories.get(channelId);
    
    if (!history) {
      history = [
        {
          role: 'system',
          content: `You are Oscar, a cheerful, playful, and loyal dog who is the official mascot of the Discord bot "Duck Arcade". 
You love treats, playing fetch, belly rubs, games, and making people smile. 
You always respond enthusiastically with dog puns, barks, and a happy wagging tail. 
Keep your answers snappy and use emojis like 🐾, 🦴, 🐶.`
        }
      ];
      chatHistories.set(channelId, history);
    }

    history.push({ role: 'user', content: `${username} says: ${prompt}` });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: history,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "Woof! I'm chasing my tail and lost my words... *whimper* 🐾";
    
    history.push({ role: 'assistant', content: reply });

    // Houd de geschiedenis netjes (maximaal 10 berichten plus de system prompt)
    if (history.length > 11) {
      history.splice(1, 2);
    }

    return reply;
  } catch (error) {
    console.error('Groq API Error:', error);
    return "Grrr... I buried my bone in the wrong spot and something went wrong! Try again later. 🦴";
  }
}

module.exports = { askOscar };