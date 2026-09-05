const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const pool = require('../database');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS honeypot_logs (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      caught_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS honeypot_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      log_channel_id TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
initDB().catch(err => console.error('❌ Honeypot DB init error:', err));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Honeypot trap system — catch and ban raiders/spambots automatically')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set the honeypot channel (any message sent here = instant ban)')
        .addChannelOption(opt => opt.setName('channel').setDescription('The honeypot trap channel').setRequired(true))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Where to log caught users (optional)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable the honeypot for this server')
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View how many users Oscar has caught and banned')
    )
    .addSubcommand(sub =>
      sub.setName('recent')
        .setDescription('View the most recently caught users')
        .addIntegerOption(opt => opt.setName('limit').setDescription('How many to show (max 10)').setRequired(false).setMinValue(1).setMaxValue(10))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── SETUP ─────────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const logChannel = interaction.options.getChannel('log_channel');

      await pool.query(`
        INSERT INTO honeypot_config (guild_id, channel_id, log_channel_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id) DO UPDATE SET channel_id=$2, log_channel_id=$3, updated_at=NOW()
      `, [guildId, channel.id, logChannel?.id || null]);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🍯 Honeypot Active')
          .setDescription(
            `Any non-bot user who sends a message in <#${channel.id}> will be **instantly banned**.\n\n` +
            `**Make sure:**\n` +
            `• The channel is visible to raiders/new members but NOT to your real members\n` +
            `• Oscar has **Ban Members** permission\n` +
            `• Oscar's role is **above** the members you want to catch` +
            (logChannel ? `\n\n📋 Bans will be logged in <#${logChannel.id}>` : '')
          )
          .setFooter({ text: 'Tip: name the channel something obvious like #free-nitro or #announcements to lure bots' })]
      });
    }

    // ── DISABLE ───────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      await pool.query(`DELETE FROM honeypot_config WHERE guild_id=$1`, [guildId]);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff9900)
          .setDescription('🍯 Honeypot disabled for this server.')],
        ephemeral: true
      });
    }

    // ── STATS ─────────────────────────────────────────────────────────────────
    if (sub === 'stats') {
      const { rows: global } = await pool.query(`SELECT COUNT(*) FROM honeypot_logs`);
      const { rows: server } = await pool.query(`SELECT COUNT(*) FROM honeypot_logs WHERE guild_id=$1`, [guildId]);
      const { rows: today } = await pool.query(`SELECT COUNT(*) FROM honeypot_logs WHERE guild_id=$1 AND caught_at >= NOW() - INTERVAL '24 hours'`, [guildId]);
      const { rows: config } = await pool.query(`SELECT channel_id FROM honeypot_config WHERE guild_id=$1`, [guildId]);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🍯 Honeypot Statistics')
          .setThumbnail(interaction.guild.iconURL({ extension: 'png' }))
          .addFields(
            { name: '🌍 Total caught (all servers)', value: `**${global[0].count}** users`, inline: true },
            { name: '🏠 Caught in this server', value: `**${server[0].count}** users`, inline: true },
            { name: '📅 Caught today', value: `**${today[0].count}** users`, inline: true },
            { name: '📍 Honeypot Channel', value: config[0] ? `<#${config[0].channel_id}>` : '❌ Not configured', inline: true },
          )
          .setTimestamp()
          .setFooter({ text: 'Oscar Honeypot System' })]
      });
    }

    // ── RECENT ────────────────────────────────────────────────────────────────
    if (sub === 'recent') {
      const limit = interaction.options.getInteger('limit') || 5;
      const { rows } = await pool.query(`
        SELECT username, user_id, caught_at FROM honeypot_logs
        WHERE guild_id=$1 ORDER BY caught_at DESC LIMIT $2
      `, [guildId, limit]);

      if (rows.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x00cc66).setDescription('✅ No users caught yet — your server is clean!')],
          ephemeral: true
        });
      }

      const lines = rows.map(r =>
        `🔨 **${r.username}** (\`${r.user_id}\`) — <t:${Math.floor(new Date(r.caught_at).getTime() / 1000)}:R>`
      ).join('\n');

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle(`🍯 Last ${rows.length} Caught`)
          .setDescription(lines)
          .setTimestamp()]
      });
    }
  },
};