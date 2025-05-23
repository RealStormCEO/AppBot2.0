const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const {
  cleanEmbed,
  convertToEmbedBuilder,
  replacePlaceholders,
} = require('../../utils/embedUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accept an application by ID')
    .addIntegerOption(option =>
      option
        .setName('application_id')
        .setDescription('ID of the application to accept')
        .setRequired(true)
    ),

  async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
    });
    }
    const applicationId = interaction.options.getInteger('application_id');
    const guildId = interaction.guild.id;

    try {
      // Fetch the application
      const [apps] = await db.execute(
        'SELECT * FROM applications WHERE id = ? AND guild_id = ?',
        [applicationId, guildId]
      );

      if (apps.length === 0) {
        return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
      }

      const application = apps[0];

      // Fetch guild settings (for embed and DM enabled flag)
      const [settings] = await db.execute(
        'SELECT dm_accept_enabled, dm_accept_embed FROM guild_settings WHERE guild_id = ?',
        [guildId]
      );

      if (settings.length === 0 || settings[0].dm_accept_enabled !== 1) {
        return interaction.reply({
          content: '❌ DM on accept is disabled for this server.',
          ephemeral: true,
        });
      }

      const guildSettings = settings[0];

      // Fetch guild name dynamically
      const [guildRows] = await db.execute('SELECT name FROM guilds WHERE id = ?', [guildId]);
      const guildName = (guildRows.length > 0 && guildRows[0].name) || 'Unknown Server';

      // Send DM with accept embed
      const success = await sendAcceptDM(interaction.client, application, guildSettings, guildName);

      if (!success) {
        return interaction.reply({
          content: '❌ Failed to send DM to user. They may have DMs disabled or blocked the bot.',
          ephemeral: true,
        });
      }

      // Update application to mark dm_sent = 1 and application_status = 2 (accepted)
      await db.execute(
        'UPDATE applications SET dm_sent = 1, application_status = 2 WHERE id = ?',
        [applicationId]
      );

      // Reply with an embed confirmation
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Application Accepted')
        .setDescription(`**${application.username}**'s application accepted and user notified.`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error('Error in accept command:', err);
      return interaction.reply({
        content: '❌ An error occurred while accepting the application.',
        ephemeral: true,
      });
    }
  },
};

async function sendAcceptDM(client, application, guildSettings, guildName) {
  try {
    // Parse embed JSON from DB
    let embedJson = JSON.parse(guildSettings.dm_accept_embed);

    // Fetch the Discord user to DM
    const user = await client.users.fetch(application.user_id);
    if (!user) throw new Error('User not found');

    // Prepare placeholder replacements
    const replacements = {
      '{server.name}': guildName,
      '{server.id}': application.guild_id,
      '{user.name}': user.username,
      '{user.id}': user.id,
      '{user.tag}': `${user.username}#${user.discriminator}`,
    };

    // Replace placeholders recursively
    const replacedEmbed = replacePlaceholders(embedJson, replacements);

    // If replacedEmbed is a string (JSON string), parse it back to an object
    let embedObj;
    if (typeof replacedEmbed === 'string') {
      try {
        embedObj = JSON.parse(replacedEmbed);
      } catch (e) {
        console.error('Failed to parse replaced embed string to JSON:', e);
        throw e;
      }
    } else {
      embedObj = replacedEmbed;
    }

    console.log('Embed JSON after placeholder replacement and parsing:', JSON.stringify(embedObj, null, 2));

    // Clean the embed to ensure valid structure
    const cleanedEmbed = cleanEmbed(embedObj);
    if (!cleanedEmbed) {
      throw new Error('Accept embed invalid or empty after cleaning.');
    }

    // Convert cleaned embed JSON to EmbedBuilder instance
    const embed = convertToEmbedBuilder(cleanedEmbed);

    // Send the DM
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Failed to send accept DM:', error);
    return false;
  }
}
