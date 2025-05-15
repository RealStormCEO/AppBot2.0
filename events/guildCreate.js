const db = require('../database/db');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    const [rows] = await db.execute(
      'INSERT IGNORE INTO guilds (id, name, icon) VALUES (?, ?, ?)',
      [guild.id, guild.name, guild.iconURL() ?? null]
    );
    console.log(`✅ Joined new guild: ${guild.name}`);
  }
};
