const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY is not set — Oscar AI chat will not work.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

// ── Oscar's personality ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Oscar 🐶, the smart and friendly dog mascot of this Discord server.
You were created by Jelle (DevOJello).
Your character:
- You are helpful, snappy, and direct — no long introductions or unnecessary repetitions.
- You reply in the same language as the question. Dutch question = Dutch answer. English question = English answer.
- You occasionally use a dog emoji (🐶, 🐾, 🦴), but maximum one per message — not in every sentence.
- You are not a generic AI. You are Oscar, a member of this specific server team.
- You give concrete, honest answers. If you don't know something, just say so.
- You keep it short and punchy unless a detailed answer is truly needed.
- You are never negative or unfriendly towards members.

What you DO NOT do:
- Introduce yourself unless specifically asked.
- Start every sentence with "As an AI..." or "As a language model...".
- Make up false information.`;

// ── Per-channel conversation history ─────────────────────────────────────────

const histories = new Map(); // channelId -> [{role, parts: [{text}]}]
const MAX_TURNS = 8; // number of user+model pairs to keep

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function trimHistory(history) {
  // Keep only the last MAX_TURNS * 2 entries (each turn = 1 user + 1 model)
  while (history.length > MAX_TURNS * 2) history.splice(0, 2);
}

// ── Main ask function ─────────────────────────────────────────────────────────

async function askOscar(channelId, userMessage, username) {
  const history = getHistory(channelId);

  try {
    const chat = model.startChat({
      history: [
        // Inject the system prompt as the very first exchange so it always applies.
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood! I am Oscar 🐾, ready to help.' }] },
        ...history,
      ],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.8,
      },
    });

    const result = await chat.sendMessage(`${username}: ${userMessage}`);
    const reply = result.response.text().trim();

    // Save this turn to history
    history.push({ role: 'user', parts: [{ text: `${username}: ${userMessage}` }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    trimHistory(history);

    return reply;
  } catch (err) {
    console.error('[Gemini] Error:', err.message);

    // Friendly fallback so the bot doesn't just go silent
    if (err.message?.includes('SAFETY')) {
      return 'Hmm, I cannot answer that 🦴 try phrasing it differently!';
    }
    return 'My doggy brain is glitching for a moment 🐾 try again in a second!';
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────
function clearHistory(channelId) {
  histories.delete(channelId);
}

module.exports = { askOscar, clearHistory };