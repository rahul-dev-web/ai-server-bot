const { Client, GatewayIntentBits } = require('discord.js');

let client = null;
let ready = false;

const initDiscordBot = async () => {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn('⚠️  DISCORD_BOT_TOKEN not set — Discord execution disabled');
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  const onBotReady = () => {
    ready = true;
    console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
  };

  client.once('clientReady', onBotReady);

  client.on('error', (err) => {
    console.error('Discord client error:', err);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
};

const getClient = () => client;

const isBotReady = () => ready && client?.isReady();

module.exports = {
  initDiscordBot,
  getClient,
  isBotReady
};
