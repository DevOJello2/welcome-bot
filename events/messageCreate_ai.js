const { askOscar } = require('../modules/gemini');
const pool = require('../database');

const COOLDOWNS = new Map(); // userId -> last reply timestamp
const COOLDOWN_MS = 3000; // 3s between replies per user to prevent spam

async function getAIChannel(guildId) {
  const { rows } = await pool.query(
    `SELECT channel_id FROM ai_config WHERE guild_id=$1 AND enabled=TRUE`, [guildId]
  );
  return rows[0]?.channel_id || null;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const now = Date.now();
    const last = COOLDOWNS.get(message.author.id) || 0;
    if (now - last < COOLDOWN_MS) return;

    const isMentioned = message.mentions.has(client.user);
    const aiChannelId = await getAIChannel(message.guild.id);
    const isAIChannel = aiChannelId && message.channelId === aiChannelId;

    if (!isMentioned && !isAIChannel) return;

    // Strip the @Oscar mention from the question if present
    const question = message.content
      .replace(/<@!?[0-9]+>/g, '')
      .trim();

    if (!question && !isAIChannel) return;
    if (!question && isAIChannel) return; // empty message in AI channel — ignore

    COOLDOWNS.set(message.author.id, now);

    try {
      await message.channel.sendTyping();
      const reply = await askOscar(message.channelId, question, message.author.username);

      // Split long replies (Discord 2000 char limit)
      if (reply.length <= 1990) {
        await message.reply({ content: reply, allowedMentions: { repliedUser: false } });
      } else {
        const chunks = reply.match(/[\s\S]{1,1990}/g) || [reply];
        for (const chunk of chunks) {
          await message.channel.send({ content: chunk, allowedMentions: { repliedUser: false } });
        }
      }
    } catch (err) {
      console.error('[AI messageCreate] Error:', err.message);
    }
  },
};
