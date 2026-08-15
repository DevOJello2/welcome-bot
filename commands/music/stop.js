const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const queue = client.distube.getQueue(guildId);

    if (!queue) {
      return interaction.reply({ content: '❌ There is no music playing right now!', ephemeral: true });
    }

    try {
      const res = await pool.query('SELECT music_247 FROM guild_settings WHERE guild_id = $1', [guildId]);
      const is247 = res.rows.length > 0 ? res.rows[0].music_247 : false;

      if (is247) {
        queue.stop();
        await interaction.reply('🛑 Music stopped and queue cleared. (The bot stays in the voice channel because **24/7 mode** is active).');
      } else {
        queue.stop();
        await interaction.reply('🛑 Music stopped and the bot left the voice channel.');
      }
    } catch (err) {
      console.error('Error in stop command:', err);
      queue.stop();
      await interaction.reply('🛑 Music stopped.');
    }
  }
};