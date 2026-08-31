const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist in your voice channel')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song name, YouTube/Spotify/SoundCloud URL')
        .setRequired(true)
        .setAutocomplete(false)
    ),

  async execute(interaction, client) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ You need to be in a voice channel first!')],
        ephemeral: true
      });
    }

    const botVoice = interaction.guild.members.me.voice.channel;
    if (botVoice && botVoice.id !== channel.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ I'm already playing in <#${botVoice.id}>!`)],
        ephemeral: true
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      await client.distube.play(channel, query, {
        textChannel: interaction.channel,
        member: interaction.member,
      });

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription(`🔍 Searching for **${query}**...`)]
      });
    } catch (err) {
      console.error('[Play] Error:', err.message);
      const errMsg = err.message?.includes('No result')
        ? '❌ No results found. Try a different search term or URL.'
        : '❌ Something went wrong trying to play that. Check the URL or try again.';
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(errMsg)]
      }).catch(() => {});
    }
  }
};