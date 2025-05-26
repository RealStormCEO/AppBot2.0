const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');

const { runApplicationFlow } = require('../../utils/runApplicationFlow'); // <- NEW

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Start an application via DM'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true,
    });
    }
    await runApplicationFlow(interaction, false); // false = not a button click
  }
};
