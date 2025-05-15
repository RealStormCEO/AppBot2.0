const db = require('../database/db');

module.exports = {
  name: 'guildDelete',
  async execute(guild) {
    await db.execute('DELETE FROM guilds WHERE id = ?', [guild.id]);
    console.log(`❌ Removed from guild: ${guild.name}`);
  }
};
