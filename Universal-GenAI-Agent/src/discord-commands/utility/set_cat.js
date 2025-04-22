// src\discord-commands\utility\set_cat.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updateUserPreference } = require('../../database-connector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_cat')
    .setDescription('Set your scheduled cat pic preferences!'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const channel = interaction.channel;
    const filter = m => m.author.id === userId;

    await interaction.reply({
      content: '🛠️ Let’s set up your **cat pic** preferences!',
      flags: MessageFlags.Ephemeral
    });

    // 1️⃣ Breed
    await interaction.followUp({
      content: '1️⃣ Which breed of cat are you most interested in? (comma-separated, e.g. siberian, ragdoll)',
      flags: MessageFlags.Ephemeral
    });
    const breedMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!breedMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_cat again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const breed_ids = breedMsg.first()
      .content
      .split(',')
      .map(s => s.trim())
      .map(s => s == 'ragdoll' ? 'ragd' :
                s == 'bengal' ? 'beng' :
                s == 'siberian' ? 'sibe':
                '')
      .filter(Boolean)
      .join(',');

    // 2️⃣ Frequency
    await interaction.followUp({
      content: '2️⃣ How often do you want to receive cat pic? (e.g. every minute / every hour / daily)',
      flags: MessageFlags.Ephemeral
    });
    const freqMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!freqMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_cat again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const frequency = freqMsg.first().content.trim() == 'every minute' ? '* * * * *' :
                                                        'every hour' ? '0 * * * *' :
                                                        'daily' ? '0 9 * * *' :
                                                        '0 9 * * *'; // default

    const channelId = interaction.channel.id;

    // Build the jobs prefs object
    const jobsPrefs = {
      channelId,
      breed_ids,
      frequency
    };

    // Save *only* under preferences.jobs
    await new Promise(resolve =>
      updateUserPreference(userId, 'cat', jobsPrefs, resolve)
    );

    await interaction.followUp({
      content: '✅ Your **cat** preferences have been saved!',
      flags: MessageFlags.Ephemeral
    });
  }
};