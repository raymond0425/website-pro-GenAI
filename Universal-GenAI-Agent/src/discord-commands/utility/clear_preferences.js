// src\discord-commands\utility\clearpreferences.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { clearUserPreferences } = require('../../database-connector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_preferences')
    .setDescription('Clear your stored preferences.'),
    
  async execute(interaction) {
    const userId = interaction.user.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    clearUserPreferences(userId, (err, removed) => {
      if (err) {
        console.error('DB error while clearing prefs:', err);
        return interaction.editReply('❌ Failed to clear your preferences. Please try again later.');
      }

      if (removed > 0) {
        interaction.editReply('✅ Your preferences have been cleared.');
      } else {
        interaction.editReply('ℹ️ No preferences were found for you.');
      }
    });
  },
};