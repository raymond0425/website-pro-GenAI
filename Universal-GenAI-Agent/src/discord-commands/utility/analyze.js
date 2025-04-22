// src/discord-commands/utility/analyze.js
const { SlashCommandBuilder } = require('discord.js');
const {
  analyzeUrl,
  extractQuestions,
  handleFollowUp
} = require('../../services/analyzeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Analyze any website! Usage: /analyze <url>')
    .addStringOption(option =>
      option.setName('url')
        .setRequired(true)
        .setDescription('The url you want to analyze')
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const url = interaction.options.getString('url');
    const userId = interaction.user.id;

    try {
      const { webContent, result } = await analyzeUrl({ url, userId });

      await interaction.editReply(
        result + '\nClick on 1️⃣, 2️⃣ or 3️⃣ to ask the follow‑up question! (within 60s)'
      );
      const message = await interaction.fetchReply();

      // react
      await message.react('1️⃣');
      await message.react('2️⃣');
      await message.react('3️⃣');

      const filter = (reaction, user) =>
        ['1️⃣','2️⃣','3️⃣'].includes(reaction.emoji.name) &&
        user.id === userId;

      message.awaitReactions({ filter, max: 1, time: 60_000, errors: ['time'] })
        .then(async collected => {
          const choice = collected.first().emoji.name;
          const idx = choice === '1️⃣' ? 0 : choice === '2️⃣' ? 1 : 2;
          const questions = extractQuestions(result);
          await handleFollowUp(webContent, message.channel, userId, questions[idx]);
        })
        .catch(() => {
          // timeout ‑ no follow‑up
        });

    } catch (err) {
      console.error(err);
      await interaction.editReply('An error occurred while analyzing the page.');
    }
  },
};