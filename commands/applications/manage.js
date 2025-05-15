const {
    SlashCommandBuilder,
    PermissionFlagsBits,
  } = require('discord.js');
  const db = require('../../database/db');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('application')
      .setDescription('Manage application questions')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub =>
        sub
          .setName('add-question')
          .setDescription('Add a new application question')
          .addStringOption(option =>
            option.setName('question').setDescription('The question').setRequired(true)
          ))
      .addSubcommand(sub =>
        sub
          .setName('remove-question')
          .setDescription('Remove a question by its number')
          .addIntegerOption(option =>
            option.setName('index').setDescription('The index number').setRequired(true)
          ))
      .addSubcommand(sub =>
        sub
          .setName('list-questions')
          .setDescription('List all configured application questions'))
        .addSubcommand(sub =>
          sub
          .setName('set-log')
          .setDescription('Set the channel where applications will be sent')
          .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send application logs to')
                .setRequired(true))),
          
  
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;
  
      switch (sub) {
        case 'add-question': {
          const question = interaction.options.getString('question');
  
          // Get max position for ordering
          const [rows] = await db.execute(
            'SELECT MAX(position) as max FROM application_questions WHERE guild_id = ?',
            [guildId]
          );
          const position = (rows[0]?.max || 0) + 1;
  
          await db.execute(
            'INSERT INTO application_questions (guild_id, question, position) VALUES (?, ?, ?)',
            [guildId, question, position]
          );
  
          return interaction.reply(`✅ Question added: "${question}"`);
        }
  
        case 'remove-question': {
          const index = interaction.options.getInteger('index');
  
          const [questions] = await db.execute(
            'SELECT id, question FROM application_questions WHERE guild_id = ? ORDER BY position ASC',
            [guildId]
          );
  
          if (index < 1 || index > questions.length) {
            return interaction.reply('❌ Invalid index number.');
          }
  
          const toRemove = questions[index - 1];
          await db.execute('DELETE FROM application_questions WHERE id = ?', [toRemove.id]);
  
          return interaction.reply(`🗑️ Removed question: "${toRemove.question}"`);
        }
  
        case 'list-questions': {
          const [questions] = await db.execute(
            'SELECT question FROM application_questions WHERE guild_id = ? ORDER BY position ASC',
            [guildId]
          );
  
          if (questions.length === 0) {
            return interaction.reply('📭 No questions have been added yet.');
          }
  
          const formatted = questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');
          return interaction.reply({
            content: `📝 **Current Questions:**\n${formatted}`,
            ephemeral: true,
          });
        }

        case 'set-log': {
            const channel = interaction.options.getChannel('channel');
    
            if (!channel.isTextBased()) {
              return interaction.reply({ content: '❌ Channel must be a text channel.', ephemeral: true });
            }
    
            await db.execute(
              'UPDATE guilds SET log_channel_id = ? WHERE id = ?',
              [channel.id, guildId]
            );
    
            return interaction.reply(`✅ Application log channel set to <#${channel.id}>`);
          }
  
        default:
          return interaction.reply('❌ Unknown subcommand.');
      }
    }
  };
  