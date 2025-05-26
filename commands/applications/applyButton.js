const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply-button')
    .setDescription('Create a custom embed that sends an application button'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
    });
    }
    const modal = new ModalBuilder()
      .setCustomId('apply_embed_modal')
      .setTitle('Create Application Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId('embedTitle')
      .setLabel('Embed Title (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('embedDescription')
      .setLabel('Embed Description (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const footerInput = new TextInputBuilder()
      .setCustomId('embedFooter')
      .setLabel('Footer (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
  }
};
