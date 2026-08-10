const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a full overview of all Oscar Bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Command Overview')
      .setColor(0x5865F2)
      .setDescription('Here is a list of all available commands and their functions.')
      .addFields(
        {
          name: '🛡️ Moderation',
          value:
            '`/ban` — Ban a user from the server\n' +
            '`/unban` — Unban a user via ID\n' +
            '`/tempban` — Temporarily ban a user\n' +
            '`/softban` — Softban a user and clear messages\n' +
            '`/kick` — Kick a user from the server\n' +
            '`/dossier` — View a user\'s moderation history\n' +
            '`/warn add` | `/remove` | `/list` — Manage warnings\n' +
            '`/lock channel` | `/lock open` — Lock or unlock a channel\n' +
            '`/clear` — Delete a specific number of messages\n' +
            '`/role add` | `/role remove` — Manage user roles\n' +
            '`/mute` — Give a user a timeout\n' +
            '`/unmute` — Remove a user\'s timeout'
        },
        {
          name: '🎟️ Tickets & Staff',
          value:
            '`/ticket setup` — Set up the ticket system\n' +
            '`/staffstats` — View staff activity statistics\n' +
            '`/task` — Manage staff tasks'
        },
        {
          name: '✅ Verification',
          value:
            '`/setup-verify` — Set up the verification system\n' +
            '`/welcome` — Configure welcome messages'
        },
        {
          name: '🛠️ Utility Tools',
          value:
            '`/poll` — Creates a quick poll for members to vote on\n' +
            '`/roleinfo` — Displays detailed info and permissions for a role\n' +
            '`/ping` — Checks the bot\'s current API latency and status\n' +
            '`/afk` — Sets AFK status and auto-replies when mentioned\n' +
            '`/language` — Change bot language for the server\n' +
            '`/logtoggle` — Toggle specific logging events\n' +
            '`/setlog` — Set the logging channel'
        },
        {
          name: '🚀 Boosts & Giveaways',
          value:
            '`/reactionrole add` | `remove` | `list` — Manage reaction roles\n' +
            '`/boost setup` | `/boost config` — Configure server boost rewards\n' +
            '`/giveaway start` | `end` | `reroll` | `bonus` | `bonuslist` — Manage giveaways'
        },
        {
          name: '🎮 Games',
          value:
            '`/story` — Read the legendary adventure of Jelle and Oscar'
        }
      )
      .setFooter({ text: 'Oscar Bot by DevOJello · built with discord.js v14' });

    return interaction.reply({ embeds: [embed] });
  }
};
