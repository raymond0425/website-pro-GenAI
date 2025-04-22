// src\discord-commands\utility\cat.js
const { SlashCommandBuilder } = require('discord.js');
const { getCatEmbed } = require('../../services/catService');
const { getUserPreferences } = require('../../database-connector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Get a cat picture! Usage: /cat'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
	  const userId = interaction.user.id;
	  const userDoc = await new Promise(resolve =>
		getUserPreferences(userId, doc => resolve(doc))
	  );
      const embed = await getCatEmbed(userDoc?.preferences?.cat?.breed_ids);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /cat command:', error);
      await interaction.editReply('An error occurred while fetching a cat picture.');
    }
  },
};