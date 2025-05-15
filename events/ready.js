const { Events, REST, Routes } = require('discord.js');
require('dotenv').config();
const db = require('../database/db');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const [rows] = await db.execute('SELECT * FROM guilds');
    console.log('🧠 Current DB rows:', rows);

    // Register slash commands on bot ready
    const commands = client.commands.map(cmd => cmd.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log('🌍 Registering slash commands...');
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Commands registered.');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  },
};
