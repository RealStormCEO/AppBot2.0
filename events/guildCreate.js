const db = require('../database/db');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    // Insert the guild into the guilds table if not exists
    await db.execute(
      'INSERT IGNORE INTO guilds (id, name, icon) VALUES (?, ?, ?)',
      [guild.id, guild.name, guild.iconURL() ?? null]
    );

    // Insert default settings for the guild if not exists
    await db.execute(
      `INSERT IGNORE INTO guild_settings
        (guild_id, dm_accept_enabled, dm_deny_enabled, dm_accept_embed, dm_deny_embed, updated_at)
      VALUES (?, 0, 0, NULL, NULL, NOW())`,
      [guild.id]
    );

    console.log(`✅ Joined new guild: ${guild.name} with default settings inserted.`);
  }
};
