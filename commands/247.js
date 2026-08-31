const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      music_247 BOOLEAN DEFAULT FALSE
    )
  `);
  await pool.query(`ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS music_247 BOOLEAN DEFAULT FALSE`);
}

initDB().catch(err => console.error('❌ guild_settings DB init error:', err));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode — bot stays in voice channel even when the queue is empty')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const res = await pool.query('SELECT music_247 FROM guild_settings WHERE guild_id=$1', [guildId]);
    const current = res.rows[0]?.music_247 ?? false;
    const newValue = !current;

    await pool.query(`
      INSERT INTO guild_settings (guild_id, music_247) VALUES ($1, $2)
      ON CONFLICT (guild_id) DO UPDATE SET music_247=$2
    `, [guildId, newValue]);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(newValue ? 0x00cc66 : 0xff9900)
        .setTitle(newValue ? '⏰ 24/7 Mode Enabled' : '⏰ 24/7 Mode Disabled')
        .setDescription(
          newValue
            ? 'The bot will now stay in the voice channel even when the queue is empty.'
            : 'The bot will now leave the voice channel when the queue finishes.'
        )]
    });
  }
};