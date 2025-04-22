// src\discord-commands\utility\set_jobs.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updateUserPreference } = require('../../database-connector');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_jobs')
    .setDescription('Interactively set your job posting preferences.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const channel = interaction.channel;
    const filter = m => m.author.id === userId;

    await interaction.reply({
      content: '🛠️ Let’s set up your **job** preferences! Answer the questions below. (You have 60s each)',
      flags: MessageFlags.Ephemeral
    });

    // 1️⃣ Keyword
    await interaction.followUp({
      content: '1️⃣ Which job are you interested in? (The keyword to search, e.g. "software engineer")',
      flags: MessageFlags.Ephemeral
    });
    const kwMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!kwMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const keyword = kwMsg.first().content.trim()

    // 2️⃣ Location
    await interaction.followUp({
      content: '2️⃣ Location? (Enter one city, e.g. "Hong Kong SAR", "Shenzhen", etc.)',
      flags: MessageFlags.Ephemeral
    });
    const locMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!locMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const location = locMsg.first().content.trim()

    // 3️⃣ Date Since Posted
    await interaction.followUp({
      content: '3️⃣ Max. range of date since posted? (e.g. "24hr", "past week", "past month")',
      flags: MessageFlags.Ephemeral
    });
    const dateMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!dateMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const dateSincePosted = dateMsg.first().content.trim();

    // 4️⃣ Job Type
    await interaction.followUp({
      content: '4️⃣ Job type? (e.g. "full time", "part time", "contract")',
      flags: MessageFlags.Ephemeral
    });
    const typeMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!typeMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const jobType = typeMsg.first().content.trim();

    // 5️⃣ Experience Level
    await interaction.followUp({
      content: '5️⃣ Experience level? (e.g. "internship", "entry level", "senior")',
      flags: MessageFlags.Ephemeral
    });
    const expMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60000 })
      .catch(() => null);
    if (!expMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
        flags: MessageFlags.Ephemeral
      });
    }
    const experienceLevel = expMsg.first().content.trim();

    // 6️⃣ Frequency
    await interaction.followUp({
      content: '6️⃣ How often do you want to receive job postings? (e.g. every minute / every hour / daily)',
      flags: MessageFlags.Ephemeral
    });
    const freqMsg = await channel
      .awaitMessages({ filter, max: 1, time: 60_000 })
      .catch(() => null);
    if (!freqMsg?.first()) {
      return interaction.followUp({
        content: '⏰ Timed out. Please run /set_jobs again.',
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
      keyword,
      location,
      dateSincePosted,
      jobType,
      experienceLevel,
      frequency
    };

    // Save *only* under preferences.jobs
    await new Promise(resolve =>
      updateUserPreference(userId, 'jobs', jobsPrefs, resolve)
    );

    await interaction.followUp({
      content: '✅ Your **job** preferences have been saved!',
      flags: MessageFlags.Ephemeral
    });
  }
};