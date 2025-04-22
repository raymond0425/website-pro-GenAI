// src\discord-commands\utility\jobs.js
const { SlashCommandBuilder } = require('discord.js');
const { getJobsEmbedsForUser } = require('../../services/jobsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jobs')
    .setDescription('Get job pushes! Usage: /jobs'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const userId = interaction.user.id;
      const embeds = await getJobsEmbedsForUser(userId);
      if (embeds.length === 0) {
        await interaction.editReply('No job postings found.');
      } else {
        await interaction.editReply({ embeds });
      }
    } catch (error) {
      console.error('Error in /jobs command:', error);
      await interaction.editReply('An error occurred while fetching jobs.');
    }
  },
};