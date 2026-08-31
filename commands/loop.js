const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the repeat/loop mode')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop mode to set')
        .setRequired(true)
        .addChoices(
          { name: '🚫 Off', value: '0' },
          { name: '🔂 Repeat current song', value: '1' },
          { name: '🔁 Repeat whole queue', value: '2' },
        )
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    const mode = parseInt(interaction.options.getString('mode'));
    queue.setRepeatMode(mode);

    const labels = ['🚫 Loop **disabled**', '🔂 Looping **current song**', '🔁 Looping **entire queue**'];
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x00cc66).setDescription(labels[mode])]
    });
  }
};