// src/services/catService.js
'use strict';
const { EmbedBuilder } = require('discord.js');
const { getUserPreferences } = require('../database-connector');
require('dotenv').config({ path: 'application.env' });

/**
 * Fetch a random cat image from The Cat API.
 * @param {string} breedIds - Comma-separated breed IDs.
 * @returns {Promise<object>}
 */
async function fetchCatImage(breedIds) {
  const url = `https://api.thecatapi.com/v1/images/search${breedIds ? `?breed_ids=${breedIds}` : ''}`;
  const response = await fetch(
    url, 
    {
      headers: {
        'x-api-key' : process.env.CAT_API_KEY
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Cat API returned ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No images found in Cat API response');
  }
  return data[0];
}

/**
 * Build an EmbedBuilder for a cat picture.
 * @param {string} breedIds - Comma-separated breed IDs.
 * @returns {Promise<EmbedBuilder>}
 */
async function getCatEmbed(breedIds) {
  const cat = await fetchCatImage(breedIds);
  return new EmbedBuilder()
    .setTitle('😺 Here’s your random cat!')
    .setImage(cat.url)
    .setColor(0xFF4500)
    .setFooter({ text: `ID: ${cat.id}` });
}

/**
 * Send a cat embed into a channel (for cron jobs).
 * @param {TextChannel} channel
 * @param {string} userId
 */
async function sendCatToChannel(channel, userId) {
  const userDoc = await new Promise(resolve =>
    getUserPreferences(userId, doc => resolve(doc))
  );

  const breedIds = userDoc?.preferences?.cat?.breed_ids; // Get the breed_ids from userDoc
  const embed = await getCatEmbed(breedIds);
  await channel.send({ embeds: [embed] });
}

module.exports = {
  getCatEmbed,
  sendCatToChannel,
};