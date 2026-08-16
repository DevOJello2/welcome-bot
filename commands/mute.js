const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildLang } = require('../utils/getLang');
const { t } = require('../locales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Give a user a timeout')
    .setDescriptionLocalizations({
      'nl': 'Geef een gebruiker een timeout',
      'fr': 'Donner un délai d\'expiration à un utilisateur',
      'hi': 'एक user को timeout दें'
    })
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The user to mute')
        .setDescriptionLocalizations({
          'nl': 'De gebruiker die je wilt muten',
          'fr': 'L\'utilisateur à rendre muet',
          'hi': 'जिस user को mute करना है'
        })
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('duration')
        .setDescription('Duration in minutes')
        .setDescriptionLocalizations({
          'nl': 'Duur in minuten',
          'fr': 'Durée en minutes',
          'hi': 'मिनटों में duration'
        })
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the mute')
        .setDescriptionLocalizations({
          'nl': 'Reden voor de mute',
          'fr': 'Raison de la mise en sourdine',
          'hi': 'Mute करने का कारण'
        })
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const lang = await getGuildLang(interaction.guildId);

    const targetUser = interaction.options.getUser('target');
    const durationMinutes = interaction.options.getInteger('duration');
    const rawReason = interaction.options.getString('reason');
    const reason = rawReason || t(lang, 'mute_default_reason');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ 
        content: t(lang, 'user_not_found'), 
        ephemeral: true 
      });
    }

    if (!member.moderatable) {
      return interaction.reply({ 
        content: t(lang, 'cannot_mute_user'), 
        ephemeral: true 
      });
    }

    try {
      const durationMs = durationMinutes * 60 * 1000;
      await member.timeout(durationMs, reason);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription(t(lang, 'mute_success', { user: member.user.username, duration: durationMinutes, reason }))
        ]
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({ 
        content: t(lang, 'mute_error'), 
        ephemeral: true 
      });
    }
  },
};
