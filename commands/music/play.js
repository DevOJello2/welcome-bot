const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist in your voice channel')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('The URL or search term of the song')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({ content: '❌ You need to be in a voice channel to play music!', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      await client.distube.play(channel, query, {
        textChannel: interaction.channel,
        member: interaction.member,
      });
      await interaction.editReply(`🎵 Searching and loading: **${query}**...`);
    } catch (error) {
      console.error('Error in play command:', error);
      await interaction.editReply('❌ An error occurred while trying to play that song.');
    }
  }
};