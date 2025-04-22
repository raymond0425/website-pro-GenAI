// src/discord-commands/utility/set_analyze.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updateUserPreference } = require('../../database-connector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_analyze')
    .setDescription('Interactively schedule your digested content delivery and set preferences!'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const channel = interaction.channel;
    const filter = m => m.author.id === userId;

    await interaction.reply({
      content: '🛠️ Let’s set up your **analyze** topics and scheduling preferences! Answer the questions below. (You have 60s each)',
      flags: MessageFlags.Ephemeral
    });

    // 1️⃣ URL / Source
    await interaction.followUp({
      content: '1️⃣ Which specific source do you want to receive digested content from? (e.g. scmp.com)',
      flags: MessageFlags.Ephemeral
    });
    const urlMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!urlMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_analyze again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const url = urlMsg.first().content.trim();

    // 2️⃣ Topics
    await interaction.followUp({
      content: '2️⃣ What topics are you interested in? (comma‑separated)',
      flags: MessageFlags.Ephemeral
    });
    const topicsMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!topicsMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_analyze again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const topics = topicsMsg
      .first()
      .content
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // 3️⃣ Frequency
    await interaction.followUp({
      content: '3️⃣ How often do you want to receive content? (e.g. every minute / every hour / daily)',
      flags: MessageFlags.Ephemeral
    });
    const freqMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!freqMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_analyze again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const frequency = freqMsg.first().content.trim() == 'every minute' ? '* * * * *' :
                                                        'every hour' ? '0 * * * *' :
                                                        'daily' ? '0 9 * * *' :
                                                        '0 9 * * *'; // default

    // 4️⃣ Language
    await interaction.followUp({
      content: '4️⃣ Preferred response language? (e.g. English, Chinese, etc.)',
      flags: MessageFlags.Ephemeral
    });
    const langMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!langMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_analyze again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const language = langMsg.first().content.trim();

    const channelId = interaction.channel.id;

    // Build the analyze‐prefs object
    const analyzePrefs = { channelId, url, topics, frequency, language };

    // Save only under preferences.analyze
    await new Promise(resolve =>
      updateUserPreference(userId, 'analyze', analyzePrefs, resolve)
    );

    await interaction.followUp({
      content: '✅ Your **analyze** preferences have been saved!',
      flags: MessageFlags.Ephemeral
    });
  }
};