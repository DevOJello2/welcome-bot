const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show what\'s currently playing'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue || !queue.songs[0]) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Nothing is playing right now!')],
        ephemeral: true
      });
    }

    const song = queue.songs[0];
    const current = Math.floor(queue.currentTime);
    const total = song.duration;
    const progress = Math.round((current / total) * 20);
    const bar = '▓'.repeat(progress) + '░'.repeat(20 - progress);

    const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const repeatMode = ['Off', '🔂 Song', '🔁 Queue'][queue.repeatMode] || 'Off';

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🎵 Now Playing')
        .setColor(0x5865f2)
        .setThumbnail(song.thumbnail)
        .setDescription(`**[${song.name}](${song.url})**\nUploaded by **${song.uploader?.name || 'Unknown'}**`)
        .addFields(
          { name: '⏱️ Progress', value: `\`${formatTime(current)}\` \`[${bar}]\` \`${formatTime(total)}\`` },
          { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
          { name: '🔁 Repeat', value: repeatMode, inline: true },
          { name: '📋 Queue', value: `${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''}`, inline: true },
        )
        .setFooter({ text: `Requested by ${song.user?.username || 'Unknown'}` })]
    });
  }
};