const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Start an application via DM'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const user = interaction.user;

// 🔐 Prevent multiple active applications early
global.appSessions ??= new Map();
if (global.appSessions.has(user.id)) {
  return interaction.reply({
    content: '❌ You already have an active application in progress. Please complete or cancel it before starting another.',
    ephemeral: true
  });
}

// Lock the session immediately
global.appSessions.set(user.id, {
  guildId,
  answers: {},
  startedAt: Date.now()
});

await interaction.deferReply({ ephemeral: true });   

    const [questions] = await db.execute(
      'SELECT id, question FROM application_questions WHERE guild_id = ? ORDER BY position ASC LIMIT 20',
      [guildId]
    );

    if (questions.length === 0) {
      return interaction.editReply({
        content: '❌ No application questions configured.'
      });
    }

    try {
      const dmChannel = await user.createDM();
      await dmChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📝 Application for ${interaction.guild.name}`)
            .setDescription(`Please answer the following questions one at a time.`)
            .setColor(0x2ecc71)
        ]
      });

      const answers = {};

      for (const [index, q] of questions.entries()) {
        const embed = new EmbedBuilder()
          .setTitle(`❓ Question ${index + 1}`)
          .setDescription(q.question)
          .setColor(0x5865F2);

        await dmChannel.send({ embeds: [embed] });

        const collected = await dmChannel.awaitMessages({
          filter: m => m.author.id === user.id,
          max: 1,
          time: 120000
        }).catch(() => null);

        if (!collected || !collected.size) {
          await dmChannel.send('❌ Application timed out.');
          global.appSessions.delete(user.id);
          return;
        }        

        answers[q.question] = collected.first().content;
      }

      const fields = Object.entries(answers).map(([q, a], i) => {
        const wordCount = a.trim().split(/\s+/).length;
        const charCount = a.length;

        return {
          name: `❓ ${i + 1}. ${q.slice(0, 256)}`,
          value: `${a.slice(0, 950)}\n\n✍️ Words: **${wordCount}** | 🔡 Characters: **${charCount}**`,
          inline: false
        };
      });

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
        answers,
        startedAt: Date.now()
      });

      // 🕒 Optional: auto-timeout after 10 minutes
      setTimeout(() => {
        if (global.appSessions.has(user.id)) {
          global.appSessions.delete(user.id);
          console.log(`⏱️ Application session timed out for ${user.username}`);
        }
      }, 10 * 60 * 1000); // 10 minutes

      await interaction.editReply({
        content: '📬 Check your DMs to begin the application.'
      });

    } catch (err) {
      console.error('❌ Failed to send DM:', err);
      global.appSessions.delete(user.id);
      return interaction.editReply({
        content: '❌ Unable to DM you. Please enable DMs and try again.'
      });
    }
  }
};
