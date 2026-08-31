const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume the current song'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    if (queue.paused) {
      queue.resume();
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x00cc66).setDescription('▶️ Resumed the music!')]
      });
    } else {
      queue.pause();
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff9900).setDescription('⏸️ Paused the music. Use `/pause` again to resume.')]
      });
    }
  }
};