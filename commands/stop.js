const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    let is247 = false;
    try {
      const res = await pool.query('SELECT music_247 FROM guild_settings WHERE guild_id=$1', [interaction.guild.id]);
      is247 = res.rows[0]?.music_247 ?? false;
    } catch {}

    await queue.stop();
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('🛑 Music Stopped')
        .setDescription(
          is247
            ? 'Queue cleared. The bot stays in the voice channel because **24/7 mode** is active.\nUse `/247` to disable it.'
            : 'Queue cleared and the bot left the voice channel.'
        )]
    });
  }
};