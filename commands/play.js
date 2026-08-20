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
      // Gebruik interaction als eerste argument i.p.v. alleen het channel object
      await client.distube.play(channel, query, {
        textChannel: interaction.channel,
        member: interaction.member,
        interaction: interaction,
      });
      
      // DisTube handelt de antwoorden zelf af via events, dus we geven een nette bevestiging
      if (!interaction.replied && !interaction.deferred) {
        await interaction.editReply(`🎵 Searching for: **${query}**...`).catch(() => {});
      } else {
        await interaction.followUp({ content: `🎵 Loading: **${query}**...`, ephemeral: true }).catch(() => {});
      }
    } catch (error) {
      console.error('Error in play command:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ An error occurred while trying to play that song.').catch(() => {});
      } else {
        await interaction.reply({ content: '❌ An error occurred while trying to play that song.', ephemeral: true }).catch(() => {});
      }
    }
  }
};
