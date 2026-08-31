const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VOLUME_EMOJIS = v => v === 0 ? '🔇' : v < 30 ? '🔈' : v < 70 ? '🔉' : '🔊';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust or check the music volume')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume (1–150, leave empty to check current)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(150)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    const level = interaction.options.getInteger('level');
    if (level === null) {
      const current = queue.volume;
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription(`${VOLUME_EMOJIS(current)} Current volume: **${current}%**`)]
      });
    }

    client.distube.setVolume(interaction.guild.id, level);
    const bar = '█'.repeat(Math.round(level / 10)) + '░'.repeat(10 - Math.round(level / 10));
    
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00cc66)
        .setDescription(`${VOLUME_EMOJIS(level)} Volume set to **${level}%**\n\`${bar}\``)
        .setFooter({ text: level > 100 ? '⚠️ Above 100% may distort audio' : '' })]
    });
  }
};