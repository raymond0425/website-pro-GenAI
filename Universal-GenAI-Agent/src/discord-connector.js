require('dotenv').config({ path: 'application.env' });

const fs   = require('node:fs');
const path = require('node:path');
const cron = require('node-cron');
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags
} = require('discord.js');

const { analyzeUrl, extractQuestions, handleFollowUp } = require('./services/analyzeService');
const { sendJobsToChannel } = require('./services/jobsService');
const { sendCatToChannel }  = require('./services/catService');
const { getAllRecords, getUserPreferences } = require('./database-connector');

const token = process.env.DISCORD_TOKEN;

// 1) Create client
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
});

// 2) On ready, schedule tasks
client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  rescheduleAllTasks();
});

function rescheduleAllTasks() {
  /** 
   *  Example user-data:
		const userData = {
			userId: '222996819242647553',
			preferences: {
			analyze: {
				channelId: '1325202436217897045',
				url: 'scmp.com',
				topics: ['United States', 'AI'],
				frequency: '0 * * * *', // every min
				language: 'Chinese'
			},
			jobs: {
				channelId: '1325202436217897045',
				keyword: 'software engineer',
				frequency: '0 9 * * *' // daily at 9am
			},
			cat: {
				channelId: '1325202436217897045',
				breed_ids: 'ragd,sibe',
				frequency: '* * * * * *' // every sec
			}
			}
		};*/
	// Deschedule all pre-existing jobs
	cron.getTasks().forEach((job) => {
		job.stop();
	});
	// Reschedule all jobs
	getAllRecords((userDataRecords) => {
		if (!userDataRecords) {
		  console.error('Failed to fetch user records.');
		  return;
		}
		//console.log(userDataRecords);
		userDataRecords.forEach(userData => {
		  scheduleTasks(userData.userId, userData.preferences);
		});
	  });
}

function scheduleTasks(userId, preferences) {
  // ANALYZE
  if (preferences.analyze) {
    cron.schedule(preferences.analyze.frequency, async () => {
      const channel = client.channels.cache.get(preferences.analyze.channelId);
      if (!channel) return console.error('Channel not found:', preferences.analyze.channelId);

      try {
        const { webContent, result } = await analyzeUrl({
          url: preferences.analyze.url,
          userId
        });

        const msg = await channel.send(
          `**Scheduled summary of ${preferences.analyze.url}:**\n\n` +
          result +
          `\n\nClick 1️⃣, 2️⃣ or 3️⃣ to ask the follow‑up question! (within 60s)`
        );

        await msg.react('1️⃣');
        await msg.react('2️⃣');
        await msg.react('3️⃣');

        const filter = (reaction, user) =>
          ['1️⃣','2️⃣','3️⃣'].includes(reaction.emoji.name) &&
          user.id === userId;

        const collected = await msg.awaitReactions({
          filter,
          max: 1,
          time: 60_000,
          errors: ['time']
        });

        const choice = collected.first().emoji.name;
        const idx = choice === '1️⃣' ? 0 : choice === '2️⃣' ? 1 : 2;
        const questions = extractQuestions(result);
        await handleFollowUp(webContent, channel, userId, questions[idx]);

      } catch (err) {
        console.error('Scheduled analyze error:', err);
        // channel.send('⚠️ Failed to run automatic analysis.');
      }
    });
  }

  // JOBS
  if (preferences.jobs) {
    cron.schedule(preferences.jobs.frequency, async () => {
      const channel = client.channels.cache.get(preferences.jobs.channelId);
      if (!channel) return console.error('Channel not found:', preferences.jobs.channelId);

      try {
        console.log(`Scheduled job check for keyword: ${preferences.jobs.keyword}`);
        await sendJobsToChannel(channel, userId);
      } catch (err) {
        console.error('Scheduled jobs error:', err);
        channel.send('⚠️ Failed to fetch job postings.');
      }
    });
  }

  // CAT
  if (preferences.cat) {
    cron.schedule(preferences.cat.frequency, async () => {
      const channel = client.channels.cache.get(preferences.cat.channelId);
      if (!channel) return console.error('Channel not found:', preferences.cat.channelId);

      try {
        await sendCatToChannel(channel, userId);
      } catch (err) {
        console.error('Scheduled cat error:', err);
        channel.send('⚠️ Failed to fetch cat picture.');
      }
    });
  }
}

// 3) Load slash commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'discord-commands');
for (const folder of fs.readdirSync(foldersPath)) {
  const commandsPath = path.join(foldersPath, folder);
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`Missing data/execute in ${file}`);
    }
  }
}

// 4) Interaction handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
	const database_commands = ['clear_preferences', 'set_cat', 'set_jobs', 'set_analyze'];
	if (database_commands.includes(interaction.commandName)) {
		rescheduleAllTasks();
	}
  } catch (err) {
    console.error(err);
    const reply = { content: 'Error executing command.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// 5) Login
client.login(token);