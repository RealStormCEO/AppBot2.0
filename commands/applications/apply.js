const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Start an application via DM'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const user = interaction.user;

    global.appSessions ??= new Map();

    if (global.appSessions.has(user.id)) {
      return interaction.reply({
        content: '❌ You already have an active application in progress. Please complete or cancel it before starting another.',
        ephemeral: true
      });
    }

    await interaction.reply({ content: '📬 Check your DMs to begin the application.', ephemeral: true });

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

        await dmChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📂 Choose an Application Form')
              .setDescription('Please choose which application you would like to complete.')
              .setColor(0x7289da)
          ],
          components: [formSelectRow]
        });

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

      await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📝 Application for ${interaction.guild.name}`)
            .setDescription(`Please answer the following questions one at a time.`)
            .setColor(0x2ecc71)
        ]
      });

      const answers = {};

      // Ask questions with cancel buttons
      for (const [index, q] of questions.entries()) {
        let valid = false;
        let userAnswer = '';

        while (!valid) {
          const embed = new EmbedBuilder()
            .setTitle(`❓ Question ${index + 1}`)
            .setDescription(q.question)
            .setColor(0x5865F2);

          // Cancel button on every question
          const cancelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('app_cancel')
              .setLabel('❌ Cancel Application')
              .setStyle(ButtonStyle.Danger)
          );

          await dmChannel.send({ embeds: [embed], components: [cancelRow] });

          const collected = await dmChannel.awaitMessages({
            filter: m => m.author.id === user.id,
            max: 1,
            time: 120000
          }).catch(() => null);

          if (!collected || !collected.size) {
            await dmChannel.send('❌ Application timed out.');
            return;
          }

          userAnswer = collected.first().content.trim();
          const wordCount = userAnswer.split(/\s+/).length;
          const wordMin = q.word_count_min ?? 0;

          if (wordMin > 0 && wordCount < wordMin) {
            await dmChannel.send(`⚠️ Your response must be at least **${wordMin} words**. You wrote **${wordCount} words**. Please try again.`);
          } else {
            valid = true;
          }
        }

        answers[q.question] = userAnswer;
      }

      // Confirm submission embeds & buttons...
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

      for (const embed of embeds) {
        await dmChannel.send({ embeds: [embed] });
      }

      await dmChannel.send({ components: [row] });

      global.appSessions.set(user.id, {
        guildId,
        formId: selectedFormId,
        answers,
        startedAt: Date.now()
      });

      // Auto timeout after 10 minutes
      setTimeout(() => {
        if (global.appSessions.has(user.id)) {
          global.appSessions.delete(user.id);
          console.log(`⏱️ Application session timed out for ${user.username}`);
        }
      }, 10 * 60 * 1000);

    } catch (err) {
      console.error('❌ Error in /apply command:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ There was an error starting your application.', ephemeral: true });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: '❌ There was an error starting your application.' });
      }
    }
  }
};
