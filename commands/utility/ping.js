const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with bot latency.'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setDescription(`Round-trip latency: **${sent.createdTimestamp - interaction.createdTimestamp}ms**\nAPI latency: **${interaction.client.ws.ping}ms**`)
      .setColor('Green');

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
