const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const db = require('../database/db');
const detectAIContent = require('../utils/aiDetector');
const {
  replacePlaceholders,
  cleanEmbed,
  convertToEmbedBuilder,
} = require('../utils/embedUtils');

// Import your helper functions or define them below
const {
  openTicket,
  closeTicket,
  acceptApplication,
  denyApplication,
} = require('../utils/applicationActions'); // correct path and filename

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    // Initialize global maps if not exist
    if (!global.appSessions) global.appSessions = new Map();
    if (!global.appTimeouts) global.appTimeouts = new Map();

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({ content: '❌ Error executing command.', flags: MessageFlags.Ephemeral })
            .catch(() => {});
        }
      }
    }

if (interaction.isModalSubmit() && interaction.customId === 'apply_embed_modal') {
  const title = interaction.fields.getTextInputValue('embedTitle')?.trim();
  const description = interaction.fields.getTextInputValue('embedDescription')?.trim();
  const footer = interaction.fields.getTextInputValue('embedFooter')?.trim();

  const embed = new EmbedBuilder().setColor(0x2ecc71);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_application')
      .setLabel('📩 Start Application')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.deferReply({ ephemeral: true });

  // ✅ Acknowledge the interaction and respond in the same channel
  await interaction.channel.send({
    embeds: [embed],
    components: [button],
  });
}


    // Handle buttons
    if (interaction.isButton()) {
      const userId = interaction.user.id;
      const session = global.appSessions.get(userId);

      // Cancel application at any point
      if (interaction.customId === 'app_cancel') {
        // Clear timeout
        const timeoutId = global.appTimeouts.get(userId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          global.appTimeouts.delete(userId);
        }

        // Remove session
        global.appSessions.delete(userId);

        // Delete all related messages
        const messages = global.appMessages.get(userId) ?? [];
        for (const msg of messages) {
          try {
            await msg.delete();
          } catch {}
        }
        global.appMessages.delete(userId);

        // Also delete the cancel interaction message (confirmation buttons message)
        try {
          if (interaction.message) {
            await interaction.message.delete();
          }
        } catch {}

        // Reply only if not already replied/deferred
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({ content: '❌ Application canceled.', flags: MessageFlags.Ephemeral });
        }
        return;
      }

if (interaction.customId === 'start_application') {
  const { runApplicationFlow } = require('../utils/runApplicationFlow');
  await runApplicationFlow(interaction, true);
  return;
}

      // Confirm application submission
      if (interaction.customId === 'app_confirm') {
        if (!session) {
          if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '❌ Session expired or not found.', flags: MessageFlags.Ephemeral });
          }
          return;
        }

        const { guildId, answers, formId } = session;
        const username = `${interaction.user.username}#${interaction.user.discriminator}`;

        // Clear timeout since user confirmed
        const timeout = global.appTimeouts.get(userId);
        if (timeout) {
          clearTimeout(timeout);
          global.appTimeouts.delete(userId);
        }

        await interaction.deferReply({ ephemeral: true });

        // Validate minimum word counts
        const [questionMeta] = await db.execute(
          'SELECT question, word_count_min FROM application_questions WHERE form_id = ? ORDER BY position ASC',
          [formId]
        );

        for (const { question, word_count_min } of questionMeta) {
          if (!answers[question]) continue;
          const wordCount = answers[question].trim().split(/\s+/).length;
          if (word_count_min && wordCount < word_count_min) {
            return interaction.editReply({
              content: `❌ Your answer to "${question}" must be at least **${word_count_min} words**. You submitted **${wordCount} words**. Please resubmit your application with longer answers.`,
            });
          }
        }

        // Run AI detection for each answer and calculate average
        const responseScores = {};
        let totalScore = 0;

        for (const [q, a] of Object.entries(answers)) {
          const score = await detectAIContent(a);
          responseScores[q] = { answer: a, score };
          totalScore += score;
        }

        const averageScore = totalScore / Object.keys(responseScores).length;

        // Fetch guild settings for auto deny and deny DM config
        const [guildSettingsRows] = await db.execute(
          'SELECT auto_deny_enabled, auto_deny_threshold, dm_deny_enabled, dm_deny_embed FROM guild_settings WHERE guild_id = ?',
          [guildId]
        );

        const guildSettings = guildSettingsRows[0] || {};
        const autoDenyEnabled = !!guildSettings.auto_deny_enabled;
        const autoDenyThreshold = (Number(guildSettings.auto_deny_threshold) || 0) / 100; // 0-100 to 0-1
        const dmDenyEnabled = !!guildSettings.dm_deny_enabled;
        const dmDenyEmbed = guildSettings.dm_deny_embed ? JSON.parse(guildSettings.dm_deny_embed) : null;

        // Format question scores for DB
        const formattedScores = Object.entries(responseScores)
          .map(([question, data]) => {
            const escapedAnswer = data.answer.replace(/"/g, "'");
            return `${question}:"${escapedAnswer}";${data.score.toFixed(3)}`;
          })
          .join(',');

        if (autoDenyEnabled && autoDenyThreshold > 0 && averageScore < autoDenyThreshold) {
          // Auto Deny flow
          await db.execute(
            `INSERT INTO applications
             (guild_id, form_id, user_id, username, responses, ai_score, question_scores, application_status, dm_sent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              guildId,
              formId,
              userId,
              username,
              JSON.stringify(answers),
              averageScore,
              formattedScores,
              3, // denied
              1, // dm_sent = true
            ]
          );

          // Send deny DM if enabled
          if (dmDenyEnabled && dmDenyEmbed) {
            try {
              const user = await client.users.fetch(userId);
              const replacements = {
                '{server.name}': 'Server',
                '{user.name}': user.username,
                '{user.id}': user.id,
                '{user.tag}': `${user.username}#${user.discriminator}`,
                '{server.id}': guildId,
              };
              const replacedEmbedJson = replacePlaceholders(dmDenyEmbed, replacements);
              const embedObj =
                typeof replacedEmbedJson === 'string'
                  ? JSON.parse(replacedEmbedJson)
                  : replacedEmbedJson;
              const cleanedEmbed = cleanEmbed(embedObj);
              if (cleanedEmbed) {
                const embed = convertToEmbedBuilder(cleanedEmbed);
                await user.send({ embeds: [embed] });
              }
            } catch (dmErr) {
              console.error('Failed to send auto deny DM:', dmErr);
            }
          }

          global.appSessions.delete(userId);

          return interaction.editReply({
            content: `❌ Your application was automatically denied due to AI detection score below the human threshold (${(autoDenyThreshold * 100).toFixed(1)}%).`,
          });
        }

        // Normal pending submission
        const [insertResult] = await db.execute(
          `INSERT INTO applications
           (guild_id, form_id, user_id, username, responses, ai_score, question_scores, application_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            guildId,
            formId,
            userId,
            username,
            JSON.stringify(answers),
            averageScore,
            formattedScores,
            1, // pending
          ]
        );

        // Get inserted application ID
        const insertedAppId = insertResult.insertId;

        global.appSessions.delete(userId);

        // Send confirmation DM
        try {
          const dm = await interaction.user.createDM();
          await dm.send('✅ Your application has been submitted! Thank you.');
        } catch (err) {
          console.warn('❌ Could not DM user:', err);
        }

        await interaction.editReply({ content: '📬 Application submitted via DM.' });

        // Fetch form info for logging
        const [formRows] = await db.execute(
          'SELECT title, log_channel_id FROM application_forms WHERE id = ? AND guild_id = ?',
          [formId, guildId]
        );

        const formTitle = formRows[0]?.title || 'Application';
        const logChannelId = formRows[0]?.log_channel_id;

        if (logChannelId) {
          const logChannel = await client.channels.fetch(logChannelId).catch((err) => {
            console.error('❌ Failed to fetch log channel:', err);
            return null;
          });

          if (logChannel && logChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setTitle(`📨 New Application - ${formTitle}`)
              .setDescription(`**User:** <@${userId}> (${username})`)
              .addFields(
                Object.entries(responseScores).map(([q, data]) => {
                  const wordCount = data.answer.trim().split(/\s+/).length;
                  const charCount = data.answer.length;

                  return {
                    name: `\u200b\n❓ ${q}`,
                    value: `\u200b\n📝 ${data.answer.slice(0, 900)}\n\n✍️ Words: **${wordCount}** | 🔡 Characters: **${charCount}**\n🤖 AI Detection Score: **${(data.score * 100).toFixed(1)}% human**`,
                    inline: false,
                  };
                })
              )
              .addFields({
                name: '\n📊 Average AI Score',
                value: `${(averageScore * 100).toFixed(1)}% human`,
                inline: false,
              })
              .setFooter({ text: `User ID: ${userId} | Application ID: ${insertedAppId}` })
              .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`accept_app_${insertedAppId}`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`deny_app_${insertedAppId}`)
                .setLabel('❌ Deny')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`open_ticket_${userId}_${formId}`)
                .setLabel('Open ticket with user')
                .setStyle(ButtonStyle.Primary)
            );

            await logChannel.send({ embeds: [embed], components: [buttons] }).catch((err) => {
              console.error('❌ Failed to send embed:', err);
            });
          }
        }
        return;
      }

      // Route other button presses to helper functions:

      else if (interaction.customId.startsWith('open_ticket_')) {
        await openTicket(interaction, client);
        return;
      }

      else if (interaction.customId === 'close_ticket' || interaction.customId === 'confirm_close_ticket') {
        await closeTicket(interaction);
        return;
      }

      else if (interaction.customId.startsWith('accept_app_')) {
        const applicationId = parseInt(interaction.customId.replace('accept_app_', ''));
        const guildId = interaction.guild.id;
        await acceptApplication(client, interaction, applicationId, guildId, interaction.message);
        return;
      }

      else if (interaction.customId.startsWith('deny_app_')) {
        const applicationId = parseInt(interaction.customId.replace('deny_app_', ''));
        const guildId = interaction.guild.id;
        await denyApplication(client, interaction, applicationId, guildId, interaction.message);
        return;
      }
    }
  },
};

// Helper functions (openTicket, closeTicket, acceptApplication, denyApplication, sendAcceptDM, sendDenyDM) should be
// defined here or imported from another module as in your setup
