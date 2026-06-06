const { supabaseAdmin } = require('../supabaseClient');
const { getClient, isBotReady } = require('../bot/discordBot');
const { checkBotPermissions } = require('../services/discordActions');
const {
  isHighRiskAction,
  requiresConfirmation,
  HIGH_RISK_ACTIONS
} = require('../config/actionRegistry');

const verifyServerAccess = async (guildId, discordId, action) => {
  if (!guildId || !discordId) {
    return { valid: false, reason: 'Missing guildId or discordId' };
  }

  const { data: server, error } = await supabaseAdmin
    .from('servers')
    .select('guild_id, owner_discord_id, server_name')
    .eq('guild_id', guildId)
    .eq('owner_discord_id', discordId)
    .single();

  if (error || !server) {
    return { valid: false, reason: 'Server not found or you are not the owner' };
  }

  if (!isBotReady()) {
    return { valid: false, reason: 'Discord bot is offline. Check DISCORD_BOT_TOKEN.' };
  }

  const client = getClient();
  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return {
      valid: false,
      reason: 'Bot is not in this server. Invite the bot first.',
      inviteRequired: true
    };
  }

  const permCheck = checkBotPermissions(guild, action);
  if (!permCheck.valid) {
    return permCheck;
  }

  return {
    valid: true,
    serverName: server.server_name
  };
};

module.exports = {
  verifyServerAccess,
  isHighRiskAction,
  requiresConfirmation,
  HIGH_RISK_ACTIONS
};
