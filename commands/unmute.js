const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildLang } = require('../utils/getLang');
const { t } = require('../locales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a user\'s timeout')
    .setDescriptionLocalizations({
      'nl': 'Haal de timeout van een gebruiker af',
      'fr': 'Retirer le délai d\'expiration d\'un utilisateur',
      'hi': 'User ka timeout hataayein'
    })
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The user to unmute')
        .setDescriptionLocalizations({
          'nl': 'De gebruiker waarvan je de mute wilt opheffen',
          'fr': 'L\'utilisateur à réactiver',
          'hi': 'Jis user ka unmute karna hai'
        })
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for unmuting')
        .setDescriptionLocalizations({
          'nl': 'Reden voor het unmuten',
          'fr': 'Raison de la réactivation',
          'hi': 'Unmute karne ka reason'
        })
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const lang = await getGuildLang(interaction.guildId);

    const targetUser = interaction.options.getUser('target');
    const rawReason = interaction.options.getString('reason');
    const reason = rawReason || t(lang, 'unmute_default_reason');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ 
        content: t(lang, 'user_not_found'), 
        ephemeral: true 
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ 
        content: t(lang, 'user_not_muted'), 
        ephemeral: true 
      });
    }

    try {
      await member.timeout(null, reason);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(t(lang, 'unmute_success', { user: member.user.username, reason }))
        ]
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({ 
        content: t(lang, 'unmute_error'), 
        ephemeral: true 
      });
    }
  },
};
