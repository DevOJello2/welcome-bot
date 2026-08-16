const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust the music volume')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('Volume percentage (1 to 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const queue = client.distube.getQueue(guildId);

    if (!queue) {
      return interaction.reply({ content: '❌ There is no music playing right now!', ephemeral: true });
    }

    const volume = interaction.options.getInteger('level');
    client.distube.setVolume(guildId, volume);

    await interaction.reply(`🔊 Volume has been set to **${volume}%**.`);
  }
};