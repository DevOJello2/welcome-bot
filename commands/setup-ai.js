const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      enabled BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
initDB().catch(err => console.error('❌ AI config DB init error:', err));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ai')
    .setDescription('Set a channel where Oscar replies to every message without being tagged')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('The dedicated AI chat channel').setRequired(true)),
  
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await pool.query(`
      INSERT INTO ai_config (guild_id, channel_id) VALUES ($1, $2)
      ON CONFLICT (guild_id) DO UPDATE SET channel_id=$2, enabled=TRUE, updated_at=NOW()
    `, [interaction.guild.id, channel.id]);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🐾 Oscar AI Channel Set!')
          .setDescription(`Oscar will now reply to every message in <#${channel.id}> automatically.\n\nYou can still tag @Oscar anywhere else in the server.`)
      ],
      flags: 64
    });
  },
};
