const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue')
    .addIntegerOption(opt =>
      opt.setName('page')
        .setDescription('Page number')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild.id);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ The queue is empty!')],
        ephemeral: true
      });
    }

    const PAGE_SIZE = 10;
    const page = (interaction.options.getInteger('page') || 1) - 1;
    const totalPages = Math.ceil((queue.songs.length - 1) / PAGE_SIZE) || 1;

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1);
    const pageSlice = upcoming.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const totalDuration = queue.songs.reduce((acc, s) => acc + s.duration, 0);
    const formatTime = s => {
      const m = Math.floor(s / 60), sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const queueLines = pageSlice.length > 0
      ? pageSlice.map((s, i) => `\`${page * PAGE_SIZE + i + 1}.\` [${s.name}](${s.url}) — \`${s.formattedDuration}\``).join('\n')
      : '*No more songs in queue*';

    const embed = new EmbedBuilder()
      .setTitle('🎵 Music Queue')
      .setColor(0x5865f2)
      .addFields(
        { name: '▶️ Now Playing', value: `[${current.name}](${current.url}) — \`${current.formattedDuration}\`` },
        { name: `📋 Up Next (Page ${page + 1}/${totalPages})`, value: queueLines },
      )
      .setFooter({ text: `${queue.songs.length} songs • Total duration: ${formatTime(totalDuration)} • Volume: ${queue.volume}%` });

    if (queue.repeatMode === 1) embed.setDescription('🔂 Repeat: **Song**');
    else if (queue.repeatMode === 2) embed.setDescription('🔁 Repeat: **Queue**');

    return interaction.reply({ embeds: [embed] });
  }
};