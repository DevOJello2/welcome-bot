const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
require('dotenv').config();

// Zorg dat je pool hier beschikbaar is als je PostgreSQL gebruikt
// const pool = require('./path-to-your-db-pool');

const express = require('express');
const app = express();

// Database connection
const pool = require('./database');

// Ensure Express can read JSON bodies
app.use(express.json());

app.get('/', (req, res) => res.send('Welcome Bot online'));

// ==========================================
// API ENDPOINTS FOR THE DASHBOARD
// ==========================================

// 1. Get settings for a server
app.get('/api/settings/:guildId', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const result = await pool.query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({
                guild_id: guildId,
                prefix: '!',
                welcome_channel: null,
                auto_mod: false,
                music_247: false
            });
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Save settings from the dashboard
app.post('/api/settings/update', async (req, res) => {
    try {
        const { guild_id, prefix, welcome_channel, auto_mod, music_247 } = req.body;
        
        await pool.query(
            `INSERT INTO guild_settings (guild_id, prefix, welcome_channel, auto_mod, music_247) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (guild_id) DO UPDATE 
             SET prefix = COALESCE($2, guild_settings.prefix),
                 welcome_channel = COALESCE($3, guild_settings.welcome_channel),
                 auto_mod = COALESCE($4, guild_settings.auto_mod),
                 music_247 = COALESCE($5, guild_settings.music_247)`,
            [guild_id, prefix, welcome_channel, auto_mod, music_247]
        );

        console.log(`Settings updated for server ${guild_id}`);
        res.json({ success: true, message: 'Settings successfully updated!' });
    } catch (err) {
        console.error('Error saving settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server & API listening on port ${PORT}`));

// ==========================================
// DISCORD CLIENT SETUP
// ==========================================
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

// ==========================================
// DISTUBE MUSIC SETUP
// ==========================================
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  plugins: [new YtDlpPlugin()]
});

// DisTube Event Handlers
client.distube
  .on('playSong', (queue, song) => {
    queue.textChannel?.send(`🎶 Playing **${song.name}** - \`${song.formattedDuration}\``).catch(() => {});
  })
  .on('addSong', (queue, song) => {
    queue.textChannel?.send(`✅ Added **${song.name}** to the queue!`).catch(() => {});
  })
  .on('empty', async (queue) => {
    const guildId = queue.textChannel?.guild.id;
    if (!guildId) return;

    try {
      const res = await pool.query('SELECT music_247 FROM guild_settings WHERE guild_id = $1', [guildId]);
      const is247 = res.rows.length > 0 ? res.rows[0].music_247 : false;

      if (is247) {
        queue.textChannel?.send(`ℹ️ Voice channel is empty, but **24/7 mode** is enabled so I am staying!`).catch(() => {});
      } else {
        queue.textChannel?.send(`👋 Voice channel is empty. Leaving the channel.`);
        queue.stop();
      }
    } catch (err) {
      console.error('Error handling DisTube empty event:', err);
      queue.stop();
    }
  })
  .on('error', (channel, error) => {
    console.error('DisTube error:', error);
    if (channel) {
      channel.send(`❌ An error occurred: \`${error.toString().slice(0, 1900)}\``).catch(() => {});
    }
  });

// ==========================================
// COMMANDS & EVENTS LOADING
// ==========================================
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