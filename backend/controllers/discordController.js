const { supabaseAdmin } = require('../supabaseClient');

// Get user's servers
const getUserServers = async (discordId) => {
  const { data: servers, error } = await supabaseAdmin
    .from('servers')
    .select('*')
    .eq('owner_discord_id', discordId);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    servers: servers
  };
};

// Store action result
const storeActionResult = async (guildId, userId, actionType, status, result) => {
  const { data: action, error } = await supabaseAdmin
    .from('actions')
    .insert([
      {
        guild_id: guildId,
        user_id: userId,
        action_type: actionType,
        status: status,
        result: result
      }
    ])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, action };
};

// Get action history
const getActionHistory = async (guildId, limit = 50, offset = 0) => {
  const { data: actions, error, count } = await supabaseAdmin
    .from('actions')
    .select('*', { count: 'exact' })
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    actions: actions,
    total: count
  };
};

// Log audit event
const logAuditEvent = async (guildId, userDiscordId, action, result) => {
  const { data: log, error } = await supabaseAdmin
    .from('audit_logs')
    .insert([
      {
        guild_id: guildId,
        user_discord_id: userDiscordId,
        action: action,
        result: result
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Audit log error:', error);
  }

  return { success: true, log };
};

module.exports = {
  getUserServers,
  storeActionResult,
  getActionHistory,
  logAuditEvent
};