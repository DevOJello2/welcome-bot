const fs = require('fs');
const path = path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
require('dotenv').config();

// Zorg dat je pool hier beschikbaar is als je PostgreSQL gebruikt
// const pool = require('./path-to-your-db-pool');

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Welcome Bot online'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

client.commands = new Collection();
client.prefixCommands = new Collection(); // 👈 Collectie voor prefix commando's

// 1. Inlezen van Slash Commando's
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data && typeof command.data.toJSON === 'function') {
    client.commands.set(command.data.name, command);
    console.log(`✔ Loaded Slash Command: ${command.data.name}`);
  }
}

// 2. Inlezen van Prefix Commando's (bijv. in commands/prefix/)
const prefixCommandsPath = path.join(__dirname, 'commands', 'prefix');
if (!fs.existsSync(prefixCommandsPath)) fs.mkdirSync(prefixCommandsPath, { recursive: true });

for (const file of fs.readdirSync(prefixCommandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(prefixCommandsPath, file));
  if (command.name) {
    client.prefixCommands.set(command.name, command);
    console.log(`✔ Loaded Prefix Command: ${command.name}`);
  }
}

const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath);

for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js') && f !== 'logging.js')) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.WELCOME_TOKEN);

client.once('ready', async () => {
  console.log(`👋 Welcome Bot logged in as ${client.user.tag}`);
  try {
    const commandsJSON = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
    if (!process.env.WELCOME_CLIENT_ID) return console.warn('WELCOME_CLIENT_ID not set');
    await rest.put(
      Routes.applicationCommands(process.env.WELCOME_CLIENT_ID),
      { body: commandsJSON }
    );
    console.log('✅ Welcome commands deployed globally.');
  } catch (err) {
    console.error('Failed to deploy commands:', err);
  }
});

// Functie om de prefix op te halen uit de database (of standaard '!' te gebruiken)
async function getGuildPrefix(guildId) {
  if (!guildId) return '!';
  try {
    // Pas dit aan naar jouw database pool variabele indien nodig
    const res = await pool.query('SELECT prefix FROM guild_settings WHERE guild_id = $1', [guildId]);
    return res.rows[0]?.prefix || '!';
  } catch (err) {
    return '!';
  }
}

// 3. MessageCreate Handler voor Prefix Commando's
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const prefix = await getGuildPrefix(message.guild.id);
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply({ content: '❌ Er is iets misgegaan bij het uitvoeren van dit commando.' }).catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    for (const command of client.commands.values()) {
      if (typeof command.handleButton === 'function') {
        try {
          await command.handleButton(interaction, client);
        } catch (err) {
          console.error('Button handler error:', err);
        }
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Something went wrong.', flags: 64 });
      } else {
        await interaction.reply({ content: '❌ Something went wrong.', flags: 64 });
      }
    } catch {}
  }
});

require('./utils/logging')(client);
require('./events/logging')(client);

client.login(process.env.WELCOME_TOKEN);
