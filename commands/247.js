const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle the 24/7 music mode on or off for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;

    try {
      const res = await pool.query('SELECT music_247 FROM guild_settings WHERE guild_id = $1', [guildId]);
      let currentState = res.rows.length > 0 ? res.rows[0].music_247 : false;
      let newState = !currentState;

      await pool.query(
        `INSERT INTO guild_settings (guild_id, music_247) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET music_247 = $2`,
        [guildId, newState]
      );

      const statusText = newState ? '🟢 **Enabled** (The bot will stay in the voice channel)' : '🔴 **Disabled** (The bot will leave when the queue is empty)';
      await interaction.editReply(`24/7 music mode is now ${statusText}.`);
    } catch (err) {
      console.error('Error in 24/7 command:', err);
      await interaction.editReply('❌ An error occurred while updating the 24/7 setting.');
    }
  }
};