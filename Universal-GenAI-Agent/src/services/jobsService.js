// src/services/jobsService.js
'use strict';
const { linkedin_query } = require('../linkedin-connector');
const { getUserPreferences } = require('../database-connector');
const { EmbedBuilder } = require('discord.js');

/**
 * Fetch user preferences from the DB.
 * @param {string} userId
 * @returns {Promise<object>}
 */
function fetchUserPrefs(userId) {
  return new Promise((resolve, reject) => {
    getUserPreferences(userId, doc => resolve(doc));
  });
}

/**
 * Build an array of job embeds for a given user.
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<EmbedBuilder[]>}
 */
async function getJobsEmbedsForUser(userId, limit = 5) {
  const userDoc = await fetchUserPrefs(userId);

  const options = {
    keyword: userDoc?.preferences?.jobs?.keyword || '',
    location: userDoc?.preferences?.jobs?.location || '',
    dateSincePosted: userDoc?.preferences?.jobs?.dateSincePosted || 'past week',
    jobType: userDoc?.preferences?.jobs?.jobType || 'full time',
    remoteFilter: userDoc?.preferences?.jobs?.remoteFilter || 'on site',
    salary: userDoc?.preferences?.jobs?.salary || '0',
    experienceLevel: userDoc?.preferences?.jobs?.experienceLevel || 'entry level',
    limit: `${limit}`,
    page: '0',
  };

  let jobs = await linkedin_query(options);
  jobs = jobs.filter(job => job.jobUrl);

  return jobs.map(job =>
    new EmbedBuilder()
      .setTitle(job.position)
      .setDescription(`${job.company}\n\n[Apply Here](${job.jobUrl})`)
      .setThumbnail(job.companyLogo)
      .addFields(
        { name: 'Date Posted', value: job.date, inline: true },
        { name: 'Location', value: job.location, inline: true },
        { name: 'Salary',   value: job.salary, inline: true }
      )
  );
}

/**
 * Send job embeds into a channel (for cron jobs).
 * @param {TextChannel} channel
 * @param {string} userId
 */
async function sendJobsToChannel(channel, userId) {
  const embeds = await getJobsEmbedsForUser(userId);
  if (embeds.length === 0) {
    await channel.send('No new job postings found.');
  } else {
    await channel.send({ embeds });
  }
}

module.exports = {
  getJobsEmbedsForUser,
  sendJobsToChannel,
};