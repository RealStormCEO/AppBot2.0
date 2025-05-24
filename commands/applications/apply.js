const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Start an application via DM'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const user = interaction.user;

    // Initialize global maps if not exist
    global.appSessions ??= new Map();
    global.appTimeouts ??= new Map();
    global.appMessages ??= new Map();

    // Clear any previous session, timeout, and messages at start
    global.appSessions.delete(user.id);
    const timeout = global.appTimeouts.get(user.id);
    if (timeout) {
      clearTimeout(timeout);
      global.appTimeouts.delete(user.id);
    }
    global.appMessages.set(user.id, []);

    // Prevent multiple simultaneous applications
    if (global.appSessions.has(user.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '❌ You already have an active application in progress. Please complete or cancel it before starting another.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        return interaction.editReply({
          content: '❌ You already have an active application in progress. Please complete or cancel it before starting another.'
        });
      }
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '📬 Check your DMs to begin the application.', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.editReply({ content: '📬 Check your DMs to begin the application.' });
    }

    // Centralized cleanup function for session, timeout, messages
    const cleanupApplication = async () => {
      console.log(`[Cleanup] Cleaning up application for user: ${user.id}`);

      global.appSessions.delete(user.id);
      console.log(`[Cleanup] Deleted appSessions for user: ${user.id}`);

      const timeoutId = global.appTimeouts.get(user.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        global.appTimeouts.delete(user.id);
        console.log(`[Cleanup] Cleared appTimeout for user: ${user.id}`);
      }

      const messages = global.appMessages.get(user.id) ?? [];
      for (const msg of messages) {
        try {
          await msg.delete();
        } catch (err) {
          console.log(`[Cleanup] Failed to delete message: ${err.message}`);
        }
      }
      global.appMessages.delete(user.id);
      console.log(`[Cleanup] Deleted appMessages for user: ${user.id}`);
    };

    try {
      const [forms] = await db.execute(
        'SELECT id, title FROM application_forms WHERE guild_id = ? AND active = 1 ORDER BY created_at DESC',
        [guildId]
      );

      if (forms.length === 0) {
        await user.send('❌ No application forms available in this server.');
        return;
      }

      const dmChannel = await user.createDM();

      let selectedFormId;
      if (forms.length === 1) {
        selectedFormId = forms[0].id;
      } else {
        const formSelectRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('form_select')
            .setPlaceholder('📂 Select an application form')
            .addOptions(forms.map(f => ({
              label: f.title.slice(0, 100),
              value: f.id.toString()
            })))
        );

        const selectMessage = await dmChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📂 Choose an Application Form')
              .setDescription('Please choose which application you would like to complete.')
              .setColor(0x7289da)
          ],
          components: [formSelectRow]
        });

        global.appMessages.set(user.id, [selectMessage]);

        const collected = await dmChannel.awaitMessageComponent({
          filter: i => i.user.id === user.id && i.customId === 'form_select',
          time: 60000
        }).catch(() => null);

        if (!collected) {
          await dmChannel.send('❌ Timed out waiting for selection.');
          return;
        }

        selectedFormId = collected.values[0];
        await collected.deferUpdate();
      }

      const [questions] = await db.execute(
        'SELECT id, question, word_count_min FROM application_questions WHERE form_id = ? ORDER BY position ASC LIMIT 20',
        [selectedFormId]
      );

      if (questions.length === 0) {
        await dmChannel.send('❌ No questions found for this form.');
        return;
      }

      const sentMessages = global.appMessages.get(user.id) ?? [];

      const introMessage = await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📝 Application for ${interaction.guild.name}`)
            .setDescription(`Please answer the following questions one at a time.`)
            .setColor(0x2ecc71)
        ]
      });
      sentMessages.push(introMessage);
      global.appMessages.set(user.id, sentMessages);

      const answers = {};

      // Question loop with simultaneous cancel button and message input listening
      for (const [index, q] of questions.entries()) {
        let valid = false;

        while (!valid) {
          const embed = new EmbedBuilder()
            .setTitle(`❓ Question ${index + 1}`)
            .setDescription(q.question)
            .setColor(0x5865F2);

          const cancelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('app_cancel')
              .setLabel('❌ Cancel Application')
              .setStyle(ButtonStyle.Danger)
          );

          const questionMessage = await dmChannel.send({ embeds: [embed], components: [cancelRow] });

          const currentSentMessages = global.appMessages.get(user.id) ?? [];
          currentSentMessages.push(questionMessage);
          global.appMessages.set(user.id, currentSentMessages);

          try {
            const collected = await Promise.race([
              dmChannel.awaitMessages({
                filter: m => m.author.id === user.id,
                max: 1,
                time: 120000,
                errors: ['time'],
              }),

              dmChannel.awaitMessageComponent({
                filter: i => i.user.id === user.id && i.customId === 'app_cancel',
                time: 120000,
                errors: ['time'],
              }),
            ]);

            if (collected.isButton && collected.customId === 'app_cancel') {
              await collected.deferUpdate();

              await dmChannel.send('❌ Application canceled.');
              await cleanupApplication();
              return;
            }

            const userAnswer = collected.first().content.trim();
            const wordCount = userAnswer.split(/\s+/).length;
            const wordMin = q.word_count_min ?? 0;

            if (wordMin > 0 && wordCount < wordMin) {
              await dmChannel.send(`⚠️ Your response must be at least **${wordMin} words**. You wrote **${wordCount} words**. Please try again.`);
            } else {
              answers[q.question] = userAnswer;
              valid = true;
            }
          } catch (err) {
            console.log(`[Timeout/Error] Awaiting response failed for user ${user.id}: ${err.message}`);

            await dmChannel.send('❌ Application timed out due to inactivity.');
            await cleanupApplication();
            return;
          }
        }
      }

      global.appSessions.set(user.id, {
        guildId,
        formId: selectedFormId,
        answers,
        startedAt: Date.now()
      });

      const fields = Object.entries(answers).map(([q, a], i) => ({
        name: `❓ ${i + 1}. ${q.slice(0, 256)}`,
        value: `${a.slice(0, 950)}`,
        inline: false
      }));

      const embeds = [];
      while (fields.length > 0) {
        embeds.push(
          new EmbedBuilder()
            .setTitle('📋 Please confirm your application:')
            .addFields(fields.splice(0, 10))
            .setColor(0x3498db)
        );
      }

      for (const embed of embeds) {
        const confirmMessage = await dmChannel.send({ embeds: [embed] });
        const confirmMessages = global.appMessages.get(user.id) ?? [];
        confirmMessages.push(confirmMessage);
        global.appMessages.set(user.id, confirmMessages);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('app_confirm')
          .setLabel('✅ Confirm Submission')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('app_cancel')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const buttonsMessage = await dmChannel.send({ components: [row] });
      const finalMessages = global.appMessages.get(user.id) ?? [];
      finalMessages.push(buttonsMessage);
      global.appMessages.set(user.id, finalMessages);

      // Auto timeout after 10 minutes
      const timeoutId = setTimeout(() => {
        if (global.appSessions.has(user.id)) {
          global.appSessions.delete(user.id);
          global.appTimeouts.delete(user.id);
          console.log(`⏱️ Application session timed out for ${user.username}`);
          dmChannel.send('❌ Your application session has timed out due to inactivity. Please start again if you wish to apply.');

          const timeoutMessages = global.appMessages.get(user.id) ?? [];
          for (const msg of timeoutMessages) {
            try { msg.delete(); } catch {}
          }
          global.appMessages.delete(user.id);
        }
      }, 10 * 60 * 1000);

      global.appTimeouts.set(user.id, timeoutId);

    } catch (err) {
      console.error('❌ Error in /apply command:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ There was an error starting your application.', flags: MessageFlags.Ephemeral });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: '❌ There was an error starting your application.' });
      }
    }
  }
};
