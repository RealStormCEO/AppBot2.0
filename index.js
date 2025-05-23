require('dotenv').config();
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { loadFiles } = require('./utils/loader');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
],
});

client.commands = new Collection();

const BASE_DIR = __dirname;
const COMMANDS_DIR = path.join(BASE_DIR, 'commands');
const EVENTS_DIR = path.join(BASE_DIR, 'events');

// Load Commands
const commandFiles = loadFiles(COMMANDS_DIR);
for (const file of commandFiles) {
  const command = (require(file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARN] Command at ${file} is missing "data" or "execute"`);
  }
}

// Load Events
const eventFiles = loadFiles(EVENTS_DIR);
for (const file of eventFiles) {
  const event = require(file);
  if (event.name && typeof event.execute === 'function') {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  } else {
    console.warn(`[WARN] Event at ${file} is missing "name" or "execute"`);
  }
}

client.login(process.env.DISCORD_TOKEN);

module.exports = { client };
