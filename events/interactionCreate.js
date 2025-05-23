const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const db = require('../database/db');
const detectAIContent = require('../utils/aiDetector');
const { replacePlaceholders, cleanEmbed, convertToEmbedBuilder } = require('../utils/embedUtils');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Error executing command.', ephemeral: true }).catch(() => {});
        }
      }
    }

    // Handle buttons
    if (interaction.isButton()) {
      const userId = interaction.user.id;
      const session = global.appSessions?.get(userId);

      // Cancel application at any point
      if (interaction.customId === 'app_cancel') {
        global.appSessions?.delete(userId);
        return interaction.reply({ content: '❌ Application canceled.', ephemeral: true });
      }

      // Confirm application submission
      if (interaction.customId === 'app_confirm') {
        if (!session) {
          return interaction.reply({ content: '❌ Session expired or not found.', ephemeral: true });
        }

        const { guildId, answers, formId } = session;
        const username = `${interaction.user.username}#${interaction.user.discriminator}`;

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
        const autoDenyThreshold = (Number(guildSettings.auto_deny_threshold) || 0) / 100; // convert 0-100 to decimal 0-1
        const dmDenyEnabled = !!guildSettings.dm_deny_enabled;
        const dmDenyEmbed = guildSettings.dm_deny_embed ? JSON.parse(guildSettings.dm_deny_embed) : null;

        // Format question scores for DB
        const formattedScores = Object.entries(responseScores).map(([question, data]) => {
          const escapedAnswer = data.answer.replace(/"/g, "'");
          return `${question}:"${escapedAnswer}";${data.score.toFixed(3)}`;
        }).join(',');

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
              3,  // denied
              1   // dm_sent = true
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
              const embedObj = typeof replacedEmbedJson === 'string' ? JSON.parse(replacedEmbedJson) : replacedEmbedJson;
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
        await db.execute(
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
          const logChannel = await client.channels.fetch(logChannelId).catch(err => {
            console.error('❌ Failed to fetch log channel:', err);
            return null;
          });

          if (logChannel && logChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setTitle(`📨 ${formTitle} Submitted`)
              .setDescription(`**User:** <@${userId}> (${username})`)
              .addFields(
                Object.entries(responseScores).map(([q, data]) => {
                  const wordCount = data.answer.trim().split(/\s+/).length;
                  const charCount = data.answer.length;

                  return {
                    name: `\u200b\n❓ ${q}`,
                    value: `\u200b\n📝 ${data.answer.slice(0, 900)}\n\n✍️ Words: **${wordCount}** | 🔡 Characters: **${charCount}**\n🤖 AI Detection Score: **${(data.score * 100).toFixed(1)}% human**`,
                    inline: false
                  };
                })
              )
              .addFields({
                name: '\n📊 Average AI Score',
                value: `${(averageScore * 100).toFixed(1)}% human`,
                inline: false
              })
              .setFooter({ text: `User ID: ${userId}` })
              .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`open_ticket_${userId}_${formId}`)
                .setLabel('Open ticket with user')
                .setStyle(ButtonStyle.Primary)
            );

            await logChannel.send({ embeds: [embed], components: [buttons] }).catch(err => {
              console.error('❌ Failed to send embed:', err);
            });
          }
        }
      }

      // Handle "Open ticket with user" button interaction
      else if (interaction.customId?.startsWith('open_ticket_')) {
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

          const existingChannel = interaction.guild.channels.cache.find(ch =>
            ch.name === ticketChannelName && ch.type === ChannelType.GuildText
          );

          if (existingChannel) {
            return interaction.reply({ content: `❌ Ticket channel already exists: <#${existingChannel.id}>`, ephemeral: true });
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: ticketChannelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: ['ViewChannel']
              },
              {
                id: ticketUserId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
              },
              {
                id: client.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
              }
            ]
          });

          await interaction.reply({ content: `✅ Ticket channel created: <#${ticketChannel.id}>`, ephemeral: true });
        } catch (err) {
          console.error('❌ Error creating ticket channel:', err);
          await interaction.reply({ content: '❌ Failed to create ticket channel.', ephemeral: true });
        }
      }
    }
  }
};
