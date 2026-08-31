const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song')
    .addIntegerOption(opt =>
      opt.setName('to')
        .setDescription('Skip to a specific position in the queue (e.g. 3 skips to song #3)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    const skipTo = interaction.options.getInteger('to');
    try {
      if (skipTo) {
        if (skipTo > queue.songs.length) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ The queue only has **${queue.songs.length}** songs.`)],
            ephemeral: true
          });
        }
        await queue.jump(skipTo - 1);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x00cc66).setDescription(`⏭️ Jumped to song **#${skipTo}** in the queue.`)]
        });
      }

      const skipped = queue.songs[0];
      await queue.skip();

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`⏭️ Skipped **[${skipped.name}](${skipped.url})**`)]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Could not skip — the queue might be empty.')],
        ephemeral: true
      });
    }
  }
};