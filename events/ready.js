const { Events, REST, Routes } = require('discord.js');
require('dotenv').config();
const db = require('../database/db');
const { pollApplicationsAndSendDMs } = require('../tasks/pollApplications');

async function syncGuildsWithDatabase(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      // Insert guild if it doesn't exist
      await db.execute(
        'INSERT IGNORE INTO guilds (id, name, icon) VALUES (?, ?, ?)',
        [guild.id, guild.name, guild.iconURL() ?? null]
      );

      // Insert default settings if not exists
      await db.execute(
        `INSERT IGNORE INTO guild_settings
          (guild_id, dm_accept_enabled, dm_deny_enabled, dm_accept_embed, dm_deny_embed, updated_at)
         VALUES (?, 0, 0, NULL, NULL, NOW())`,
        [guild.id]
      );
    } catch (err) {
      console.error(`❌ Failed to sync guild ${guild.id}:`, err);
    }
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const commands = client.commands.map(cmd => cmd.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log('🌍 Registering guild commands...');
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild commands registered.');

      console.log('🌐 Registering global commands...');
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Global commands registered.');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }

    // Sync all guilds in cache with database
    await syncGuildsWithDatabase(client);

    // Start polling task
    pollApplicationsAndSendDMs(client);
  },
};
