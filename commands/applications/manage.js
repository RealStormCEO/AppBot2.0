const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-log')
    .setDescription('Assign a log channel to an application form')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Fetch all forms for the guild
    const [forms] = await db.execute(
      'SELECT id, title FROM application_forms WHERE guild_id = ? ORDER BY created_at DESC',
      [guildId]
    );

    if (forms.length === 0) {
      return interaction.reply({
        content: '❌ No application forms exist for this server.',
        ephemeral: true
      });
    }

    // Fetch viewable text channels
    const textChannels = interaction.guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText && c.viewable && c.permissionsFor(interaction.user).has('ViewChannel'))
      .map(c => ({ label: c.name, value: c.id }))
      .slice(0, 25);

    const formOptions = forms.map(f => ({
      label: f.title.slice(0, 100),
      value: f.id.toString()
    }));

    const formRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_form_log')
        .setPlaceholder('📄 Select application form')
        .addOptions(formOptions)
    );

    const channelRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_channel_log')
        .setPlaceholder('📺 Select log channel')
        .addOptions(textChannels)
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔧 Set Log Channel')
          .setDescription('Please select the application form and the channel where logs should be sent.')
          .setColor(0x00bcd4)
      ],
      components: [formRow, channelRow],
      ephemeral: true
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      max: 2,
      time: 60000
    });

    let selectedFormId = null;
    let selectedChannelId = null;

    collector.on('collect', async i => {
      if (i.customId === 'select_form_log') {
        selectedFormId = i.values[0];
        await i.deferUpdate();
      }

      if (i.customId === 'select_channel_log') {
        selectedChannelId = i.values[0];
        await i.deferUpdate();
      }

      if (selectedFormId && selectedChannelId) {
        await db.execute(
          'UPDATE application_forms SET log_channel_id = ? WHERE id = ? AND guild_id = ?',
          [selectedChannelId, selectedFormId, guildId]
        );

        await interaction.followUp({
          content: `✅ Log channel <#${selectedChannelId}> has been linked to form **${forms.find(f => f.id == selectedFormId).title}**.`,
          ephemeral: true
        });

        collector.stop();
      }
    });

    collector.on('end', collected => {
      if (!selectedFormId || !selectedChannelId) {
        interaction.followUp({
          content: '⏱️ Setup canceled or timed out.',
          ephemeral: true
        }).catch(() => {});
      }
    });
  }
};
