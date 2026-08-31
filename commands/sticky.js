const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a sticky message for this channel')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The message content to stick')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the sticky message from this channel')),

  async execute(interaction, client) {
    // Zorg dat je een database of simpele JSON/Map gebruikt om dit op te slaan per kanaal
    // Voor dit voorbeeld gebruiken we een globale Map (let op: bij een bot-restart ben je dit kwijt, sla het liefst op in een database zoals MongoDB of Quick.db)
    if (!client.stickyMessages) {
      client.stickyMessages = new Map();
    }

    const subcommand = interaction.options.getSubcommand();
    const channelId = interaction.channel.id;

    if (subcommand === 'set') {
      const content = interaction.options.getString('message');
      client.stickyMessages.set(channelId, { content, lastMessageId: null });

      await interaction.reply({ 
        content: `✅ Sticky message set for this channel: "${content}"`, 
        ephemeral: true 
      });

      // Stuur meteen de eerste sticky message
      const sentMsg = await interaction.channel.send(`📌 **Sticky Message:**\n${content}`);
      client.stickyMessages.get(channelId).lastMessageId = sentMsg.id;

    } else if (subcommand === 'remove') {
      if (!client.stickyMessages.has(channelId)) {
        return interaction.reply({ content: '❌ There is no active sticky message in this channel.', ephemeral: true });
      }

      client.stickyMessages.delete(channelId);
      await interaction.reply({ content: '🗑️ Sticky message removed from this channel.', ephemeral: true });
    }
  },
};