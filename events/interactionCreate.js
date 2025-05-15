const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const detectAIContent = require('../utils/aiDetector');

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

    // Handle application confirmation buttons
    if (interaction.isButton()) {
      const userId = interaction.user.id;
      const session = global.appSessions?.get(userId);

      if (interaction.customId === 'app_cancel') {
        global.appSessions?.delete(userId);
        return interaction.reply({ content: '❌ Application canceled.', ephemeral: true });
      }

      if (interaction.customId === 'app_confirm') {
        if (!session) {
          return interaction.reply({ content: '❌ Session expired or not found.', ephemeral: true });
        }

        const { guildId, answers } = session;
        const username = `${interaction.user.username}#${interaction.user.discriminator}`;

        const responseScores = {};
        let totalScore = 0;

        for (const [q, a] of Object.entries(answers)) {
          const score = await detectAIContent(a);
          responseScores[q] = { answer: a, score };
          totalScore += score;
        }

        const averageScore = totalScore / Object.keys(responseScores).length;

        // Store in database
        await db.execute(
          'INSERT INTO applications (guild_id, user_id, username, responses, ai_score, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [guildId, userId, username, JSON.stringify(answers), averageScore]
        );

        global.appSessions.delete(userId);

        // ✅ Try DM reply instead of public reply
        try {
          const dm = await interaction.user.createDM();
          await dm.send('✅ Your application has been submitted! Thank you.');
        } catch (err) {
          console.warn('❌ Could not DM user:', err);
        }

        // Acknowledge button interaction quietly
        await interaction.reply({ content: '📬 Application submitted via DM.', ephemeral: true }).catch(() => {});

        // ✅ Send to log channel
        const [guildRows] = await db.execute(
          'SELECT log_channel_id FROM guilds WHERE id = ?',
          [guildId]
        );

        const logChannelId = guildRows[0]?.log_channel_id;
        if (logChannelId) {
          const logChannel = await client.channels.fetch(logChannelId).catch(err => {
            console.error('❌ Failed to fetch log channel:', err);
            return null;
          });

          if (logChannel && logChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setTitle('📨 New Application Submitted')
              .setDescription(`**User:** <@${userId}> (${username})`)
              .addFields(
                Object.entries(responseScores).map(([q, data]) => ({
                  name: `❓ ${q}`,
                  value: `📝 ${data.answer.slice(0, 900)}\n🧠 AI: **${(data.score * 100).toFixed(1)}% human**`,
                  inline: false
                }))
              )
              .addFields({
                name: '📊 Average AI Score',
                value: `${(averageScore * 100).toFixed(1)}% human`,
                inline: false
              })
              .setFooter({ text: `User ID: ${userId}` })
              .setTimestamp();

            await logChannel.send({ embeds: [embed] }).catch(err => {
              console.error('❌ Failed to send embed:', err);
            });
          }
        }
      }
    }
  }
};
