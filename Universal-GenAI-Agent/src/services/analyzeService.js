// src/services/analyzeService.js
const webScraper = require('../web-scraper');
const { gemini_query } = require('../gemini-connector');
const { getUserPreferences } = require('../database-connector');

async function analyzeUrl({ url, userId }) {
  // 1) Fetch user‐prefs
  const userDoc = await new Promise(resolve =>
    getUserPreferences(userId, doc => resolve(doc))
  );

  // 2) Defaults
  const defaultPrefs = {
    preferences: { analyze: { topics: [], frequency: 'daily' } },
    language: 'English',
    recentQueries: []
  };
  const { preferences, language, recentQueries } = userDoc || defaultPrefs;

  // 3) Ensure protocol
  let finalUrl = url.trim();
  if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'http://' + finalUrl;

  // 4) Scrape
  const webContent = await webScraper(finalUrl);

  // 5) Build prompt
  let prompt = `
I want you to help me summarize a web page.
Of the following web content, I want you to first give me a point-form summary of the content (5 bullet points),
then suggest 3 questions for the user to potentially ask so that their productivity can be boosted as they quickly understand the content.
I want your response strictly in the following format:
**Summarized points**:
*
*
*
*
*

**Suggested questions**:
:one:
\n:two:
\n:three:
In your response, do not include any other text other than the lines above.
The web content you need to summarize: """${webContent}"""
`;

  if (preferences.analyze.topics.length) {
    prompt += `\nFrom the web content, if applicable, please prioritize topics relevant to the user's preferences: ${preferences.analyze.topics.join(', ')}.`;
  }
  if (recentQueries?.length) {
    prompt += `\nAnd consider recent queries: ${recentQueries.join(', ')}.`;
  }
  prompt += `\nStrictly use ${language} as your response language.`;

  // 6) Query Gemini
  const result = await gemini_query(prompt);

  return { webContent, result };
}

function extractQuestions(inputText) {
  return (inputText.match(/:(?:one|two|three):\s*(.*?)(?=\n|$)/g) || [])
    .map(q => q.replace(/^:(?:one|two|three):\s*/, '').trim());
}

async function handleFollowUp(webContent, channel, userId, followUpQuestion) {
  await channel.send(`**You asked the follow‑up question:** ${followUpQuestion}`);

  const prompt = `
After reading the web content, answer the question "${followUpQuestion}" using the web content when applicable and/or with your existing knowledge.
The web content: ${webContent}
Answer the question in concise and easy‑to‑understand manner.`;

  const answer = await gemini_query(prompt);
  await channel.send(`**Response for the question:**\n${answer}`);
}

module.exports = {
  analyzeUrl,
  extractQuestions,
  handleFollowUp
};