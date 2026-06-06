const axios = require('axios');
const { supabase, supabaseAdmin } = require('../supabaseClient');

const DISCORD_API = 'https://discord.com/api/v10';

const canManageGuild = (guild) => {
  if (guild.owner === true) return true;

  try {
    const perms = BigInt(guild.permissions ?? '0');
    const ADMINISTRATOR = 0x8n;
    const MANAGE_GUILD = 0x20n;
    const MANAGE_CHANNELS = 0x10n;
    const MANAGE_ROLES = 0x10000000n;

    return (
      (perms & ADMINISTRATOR) === ADMINISTRATOR ||
      (perms & MANAGE_GUILD) === MANAGE_GUILD ||
      (perms & MANAGE_CHANNELS) === MANAGE_CHANNELS ||
      (perms & MANAGE_ROLES) === MANAGE_ROLES
    );
  } catch {
    return false;
  }
};

const fetchManageableGuilds = async (accessToken) => {
  const guildsResponse = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const allGuilds = guildsResponse.data;
  const manageable = allGuilds.filter(canManageGuild);

  console.log(
    `Discord guilds: ${allGuilds.length} total, ${manageable.length} manageable`
  );

  return manageable;
};

const storeGuildsInDb = async (guilds, discordId) => {
  for (const guild of guilds) {
    const { error } = await supabaseAdmin
      .from('servers')
      .upsert(
        {
          guild_id: guild.id,
          owner_discord_id: discordId,
          server_name: guild.name,
          server_icon: guild.icon
        },
        { onConflict: 'guild_id' }
      );

    if (error) {
      console.error(`Failed to store guild ${guild.name}:`, error.message);
    }
  }
};

const formatGuilds = (guilds) =>
  guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon
  }));

// Exchange Discord code for access token and user info
const discordCallback = async (code) => {
  try {
    const tokenResponse = await axios.post(
      `${DISCORD_API}/oauth2/token`,
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;

    const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const { id: discordId, username, avatar, email } = userResponse.data;

    const guilds = await fetchManageableGuilds(accessToken);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          discord_id: discordId,
          username: username,
          avatar: avatar,
          email: email
        },
        { onConflict: 'discord_id' }
      )
      .select()
      .single();

    if (userError) {
      throw new Error(`Database error: ${userError.message}`);
    }

    await storeGuildsInDb(guilds, discordId);

    return {
      success: true,
      user: {
        id: user.id,
        discordId: user.discord_id,
        username: user.username,
        avatar: user.avatar,
        email: user.email
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      guilds: formatGuilds(guilds)
    };
  } catch (error) {
    console.error('Discord Auth Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
};

const refreshGuilds = async (accessToken) => {
  try {
    const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const { id: discordId } = userResponse.data;
    const guilds = await fetchManageableGuilds(accessToken);
    await storeGuildsInDb(guilds, discordId);

    return {
      success: true,
      guilds: formatGuilds(guilds)
    };
  } catch (error) {
    console.error('Refresh guilds error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const getUserByDiscordId = async (discordId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user };
};

module.exports = {
  discordCallback,
  refreshGuilds,
  getUserByDiscordId
};
