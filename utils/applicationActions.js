const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../database/db');
const {
  cleanEmbed,
  convertToEmbedBuilder,
  replacePlaceholders,
} = require('../utils/embedUtils');

async function openTicket(interaction, client) {
  const parts = interaction.customId.split('_');
  const ticketUserId = parts[2];
  const formId = parts[3];
  const guildId = interaction.guild.id;

  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This can only be used in a server.', ephemeral: true });
  }

  try {
    const [applications] = await db.execute(
      'SELECT username FROM applications WHERE user_id = ? AND form_id = ? AND guild_id = ?',
      [ticketUserId, formId, guildId]
    );

    if (!applications.length) {
      return interaction.reply({ content: '❌ Application data not found.', ephemeral: true });
    }

    const applicantUsername = applications[0].username;

    const [formRows] = await db.execute(
      'SELECT title FROM application_forms WHERE id = ? AND guild_id = ?',
      [formId, guildId]
    );

    const formTitle = formRows[0]?.title || 'application';
    const sanitizedTitle = formTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const ticketChannelName = `${sanitizedTitle}-${applicantUsername.split('#')[0]}`.slice(0, 90);

    const existingChannel = interaction.guild.channels.cache.find(
      (ch) => ch.name === ticketChannelName && ch.type === 0 // GuildText = 0 for discord.js v14
    );

    if (existingChannel) {
      return interaction.reply({ content: `❌ Ticket channel already exists: <#${existingChannel.id}>`, ephemeral: true });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: ticketChannelName,
      type: 0, // GuildText
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['ViewChannel'],
        },
        {
          id: ticketUserId,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
        {
          id: client.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'],
        },
      ],
    });

    // Send initial embed with close button in the ticket
    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Created')
      .setDescription(`This ticket is for <@${ticketUserId}> regarding their application.`)
      .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [closeButton] });

    await interaction.reply({ content: `✅ Ticket channel created: <#${ticketChannel.id}>`, ephemeral: true });
  } catch (err) {
    console.error('❌ Error creating ticket channel:', err);
    await interaction.reply({ content: '❌ Failed to create ticket channel.', ephemeral: true });
  }
}

async function closeTicket(interaction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This can only be used in a server.', ephemeral: true });
  }

  // Check admin permissions before proceeding
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: '❌ You need Administrator permissions to close tickets.',
      ephemeral: true,
    });
  }

  // If the button clicked is the initial 'close_ticket', send a confirmation prompt
  if (interaction.customId === 'close_ticket') {
    const confirmButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_close_ticket')
        .setLabel('Confirm Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content: '⚠️ Are you sure you want to close this ticket? This action cannot be undone.',
      components: [confirmButton],
      ephemeral: true,
    });
  }

  // If the button clicked is the confirmation button, delete the channel
  if (interaction.customId === 'confirm_close_ticket') {
    try {
      await interaction.channel.delete();
    } catch (err) {
      console.error('❌ Error closing ticket channel:', err);
      await interaction.reply({ content: '❌ Failed to close ticket channel.', ephemeral: true });
    }
  }
}

async function acceptApplication(client, interaction, applicationId, guildId, message) {
  // Fetch the application
  const [apps] = await db.execute(
    'SELECT * FROM applications WHERE id = ? AND guild_id = ?',
    [applicationId, guildId]
  );

  if (apps.length === 0) {
    await interaction.reply({ content: '❌ Application not found.', ephemeral: true });
    return;
  }

  const application = apps[0];

  // Check admin permission
  if (!interaction.member.permissions.has('Administrator')) {
    await interaction.reply({ content: '❌ You need Administrator permissions to accept applications.', ephemeral: true });
    return;
  }

  // Fetch guild settings including roles to add/remove and DM config
  const [settingsRows] = await db.execute(
    'SELECT dm_accept_enabled, dm_accept_embed, roles_to_add, roles_to_remove FROM guild_settings WHERE guild_id = ?',
    [guildId]
  );

  if (settingsRows.length === 0) {
    await interaction.reply({ content: '❌ Guild settings not found.', ephemeral: true });
    return;
  }

  const guildSettings = settingsRows[0];

  // Fetch guild name
  const [guildRows] = await db.execute('SELECT name FROM guilds WHERE id = ?', [guildId]);
  const guildName = (guildRows.length > 0 && guildRows[0].name) || 'Unknown Server';

  // Add and remove roles first - stop and notify on failure
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      await interaction.reply({ content: '❌ Could not find the guild in the client cache.', ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(application.user_id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '❌ Could not find the user in the guild to assign roles.', ephemeral: true });
      return;
    }

    // Parse roles safely
    let rolesToAdd = [];
    let rolesToRemove = [];

    if (guildSettings.roles_to_add) {
      try {
        rolesToAdd = JSON.parse(guildSettings.roles_to_add);
        if (!Array.isArray(rolesToAdd)) rolesToAdd = [];
      } catch {
        rolesToAdd = [];
      }
    }

    if (guildSettings.roles_to_remove) {
      try {
        rolesToRemove = JSON.parse(guildSettings.roles_to_remove);
        if (!Array.isArray(rolesToRemove)) rolesToRemove = [];
      } catch {
        rolesToRemove = [];
      }
    }

    const guildRoleIds = guild.roles.cache.map(r => r.id);
    const validRolesToAdd = rolesToAdd.filter(roleId => guildRoleIds.includes(roleId));
    const validRolesToRemove = rolesToRemove.filter(roleId => guildRoleIds.includes(roleId));

    for (const roleId of validRolesToAdd) {
      try {
        await member.roles.add(roleId);
      } catch (err) {
        console.error(`Failed to add role ${roleId} to user ${application.user_id}:`, err);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('❌ Failed to Add Role')
              .setDescription(`Could not add a required role <@&${roleId}> to the user. Please check that the bot's role is higher than this role in the hierarchy and has Manage Roles permission.`)
          ],
          ephemeral: true,
        });
        return; // Stop here, don't update DB or send accept DM
      }
    }

    // Remove roles, but ignore errors here
    for (const roleId of validRolesToRemove) {
      try {
        await member.roles.remove(roleId);
      } catch (err) {
        console.error(`Failed to remove role ${roleId} from user ${application.user_id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error managing roles on accept:', err);
    await interaction.reply({
      content: '❌ Unexpected error occurred while assigning roles.',
      ephemeral: true,
    });
    return;
  }

  // Now send accept DM, but only if DM enabled & embed exists
  const dmSent = await sendAcceptDM(client, application, guildSettings, guildName);

  // Update application status with dm_sent reflecting if DM was sent or not
  await db.execute(
    'UPDATE applications SET dm_sent = ?, application_status = 2 WHERE id = ?',
    [dmSent ? 1 : 0, applicationId]
  );

  // Edit the original message to show accepted status and remove buttons
  if (message) {
    const acceptedEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0x2ecc71)
      .setTitle('✅ Application Accepted')
      .setFooter({ text: `User ID: ${application.user_id} | Application ID: ${applicationId}` })
      .setTimestamp();

    await message.edit({ embeds: [acceptedEmbed], components: [] });
  }

  // Prepare reply content depending on whether DM was sent
  const description = dmSent
    ? `**${application.username}**'s application accepted and user notified.`
    : `**${application.username}**'s application accepted but user was not DMed because no Accept Embed was set up or DM sending is disabled.`;

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Application Accepted')
      .setDescription(description)
      .setTimestamp()
    ],
    ephemeral: true,
  });
}

async function denyApplication(client, interaction, applicationId, guildId, message) {
  // Fetch the application
  const [apps] = await db.execute(
    'SELECT * FROM applications WHERE id = ? AND guild_id = ?',
    [applicationId, guildId]
  );

  if (apps.length === 0) {
    await interaction.reply({ content: '❌ Application not found.', ephemeral: true });
    return;
  }

  const application = apps[0];

  // Check admin permission
  if (!interaction.member.permissions.has('Administrator')) {
    await interaction.reply({ content: '❌ You need Administrator permissions to deny applications.', ephemeral: true });
    return;
  }

  // Fetch guild settings
  const [settings] = await db.execute(
    'SELECT dm_deny_enabled, dm_deny_embed FROM guild_settings WHERE guild_id = ?',
    [guildId]
  );

  if (settings.length === 0 || settings[0].dm_deny_enabled !== 1) {
    await interaction.reply({ content: '❌ DM on deny is disabled for this server.', ephemeral: true });
    return;
  }

  const guildSettings = settings[0];

  // Fetch guild name
  const [guildRows] = await db.execute('SELECT name FROM guilds WHERE id = ?', [guildId]);
  const guildName = (guildRows.length > 0 && guildRows[0].name) || 'Unknown Server';

  // Send deny DM
  const success = await sendDenyDM(client, application, guildSettings, guildName);

  if (!success) {
    await interaction.reply({ content: '❌ Failed to send DM to user. They may have DMs disabled or blocked the bot.', ephemeral: true });
    return;
  }

  // Update application status
  await db.execute(
    'UPDATE applications SET dm_sent = 1, application_status = 3 WHERE id = ?',
    [applicationId]
  );

  // Edit the original application message to show denied status and remove buttons
  if (message) {
    const deniedEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0xe74c3c)
      .setTitle('❌ Application Denied')
      .setFooter({ text: `User ID: ${application.user_id} | Application ID: ${applicationId}` })
      .setTimestamp();

    await message.edit({ embeds: [deniedEmbed], components: [] });
  }

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('❌ Application Denied')
    .setDescription(`**${application.username}**'s application denied and user notified.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function sendAcceptDM(client, application, guildSettings, guildName) {
  try {
    if (!guildSettings.dm_accept_enabled || !guildSettings.dm_accept_embed) {
      // DM sending disabled or no embed set up
      return false;
    }

    let embedJson = JSON.parse(guildSettings.dm_accept_embed);
    const user = await client.users.fetch(application.user_id);
    if (!user) throw new Error('User not found');

    const replacements = {
      '{server.name}': guildName,
      '{server.id}': application.guild_id,
      '{user.name}': user.username,
      '{user.id}': user.id,
      '{user.tag}': `${user.username}#${user.discriminator}`,
    };

    const replacedEmbed = replacePlaceholders(embedJson, replacements);

    let embedObj;
    if (typeof replacedEmbed === 'string') {
      embedObj = JSON.parse(replacedEmbed);
    } else {
      embedObj = replacedEmbed;
    }

    const cleanedEmbed = cleanEmbed(embedObj);
    if (!cleanedEmbed) throw new Error('Accept embed invalid or empty.');

    const embed = convertToEmbedBuilder(cleanedEmbed);

    await user.send({ embeds: [embed] });
    return true;  // Successfully sent
  } catch (error) {
    console.error('Failed to send accept DM:', error);
    return false;
  }
}

async function sendDenyDM(client, application, guildSettings, guildName) {
  try {
    let embedJson = JSON.parse(guildSettings.dm_deny_embed);

    const user = await client.users.fetch(application.user_id);
    if (!user) throw new Error('User not found');

    const replacements = {
      '{server.name}': guildName,
      '{server.id}': application.guild_id,
      '{user.name}': user.username,
      '{user.id}': user.id,
      '{user.tag}': `${user.username}#${user.discriminator}`,
    };

    const replacedEmbed = replacePlaceholders(embedJson, replacements);

    let embedObj;
    if (typeof replacedEmbed === 'string') {
      embedObj = JSON.parse(replacedEmbed);
    } else {
      embedObj = replacedEmbed;
    }

    const cleanedEmbed = cleanEmbed(embedObj);
    if (!cleanedEmbed) throw new Error('Deny embed invalid or empty.');

    const embed = convertToEmbedBuilder(cleanedEmbed);

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Failed to send deny DM:', error);
    return false;
  }
}

module.exports = {
  openTicket,
  closeTicket,
  acceptApplication,
  denyApplication,
};
