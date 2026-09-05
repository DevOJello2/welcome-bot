const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const pool = require('../database');

// Cache honeypot channel IDs per guild to avoid a DB hit on every message
const honeypotCache = new Map(); // guildId -> { channelId, logChannelId, fetchedAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // re-fetch from DB every 5 minutes

async function getHoneypotConfig(guildId) {
  const cached = honeypotCache.get(guildId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

  const { rows } = await pool.query(`SELECT * FROM honeypot_config WHERE guild_id=$1`, [guildId]);
  const config = rows[0] ? { channelId: rows[0].channel_id, logChannelId: rows[0].log_channel_id, fetchedAt: Date.now() } : null;
  if (config) honeypotCache.set(guildId, config);
  else honeypotCache.delete(guildId);
  return config;
}

// Call this from your messageCreate event
async function handleHoneypot(message, client) {
  if (message.author.bot) return false;
  if (!message.guild) return false;

  let config;
  try {
    config = await getHoneypotConfig(message.guild.id);
  } catch (err) {
    console.error('[Honeypot] DB error:', err.message);
    return false;
  }

  if (!config || message.channelId !== config.channelId) return false;

  const user = message.author;
  const guild = message.guild;

  // 1. Delete the message immediately
  try { await message.delete(); } catch {}

  // 2. Ban the user
  let banned = false;
  try {
    await guild.bans.create(user.id, {
      reason: '🍯 Caught in Honeypot — automatic ban',
      deleteMessageSeconds: 60 * 60 * 24 * 7, // also wipe their last 7 days of messages
    });
    banned = true;
  } catch (err) {
    console.error(`[Honeypot] Failed to ban ${user.tag}:`, err.message);
  }

  // 3. Log to DB
  try {
    await pool.query(`
      INSERT INTO honeypot_logs (guild_id, channel_id, user_id, username)
      VALUES ($1, $2, $3, $4)
    `, [guild.id, config.channelId, user.id, user.tag]);
  } catch (err) {
    console.error('[Honeypot] Failed to log to DB:', err.message);
  }

  // 4. Post to log channel if configured
  if (config.logChannelId) {
    try {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const { rows } = await pool.query(`SELECT COUNT(*) FROM honeypot_logs WHERE guild_id=$1`, [guild.id]);
        await logChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(banned ? 0xff4444 : 0xff9900)
            .setTitle(banned ? '🍯 Honeypot — User Banned' : '🍯 Honeypot — Ban Failed')
            .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
            .addFields(
              { name: '👤 User', value: `${user} (\`${user.tag}\`)`, inline: true },
              { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
              { name: '📊 Total caught (server)', value: `${rows[0].count}`, inline: true },
              { name: banned ? '✅ Action' : '❌ Action', value: banned ? 'Banned + messages purged' : 'Could not ban — check bot permissions', inline: false },
            )
            .setTimestamp()
            .setFooter({ text: 'Oscar Honeypot System' })]
        });
      }
    } catch (err) {
      console.error('[Honeypot] Failed to send log embed:', err.message);
    }
  }

  return true; // tells the calling messageCreate handler that this message was handled
}

// Export both so you can either use this as a standalone event OR call handleHoneypot()
// from inside your existing messageCreate.js
module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    await handleHoneypot(message, client);
  },
  handleHoneypot, // for integration into existing messageCreate
};