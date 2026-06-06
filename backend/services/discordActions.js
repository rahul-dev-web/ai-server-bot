const {
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const { getClient } = require('../bot/discordBot');
const { isReadOnlyAction } = require('../config/actionRegistry');

const REQUIRED_PERMISSIONS = {
  get_server_info: null,
  list_roles: null,
  list_channels: null,
  list_categories: null,
  list_members: PermissionFlagsBits.ViewChannel,
  get_role_info: null,
  get_channel_info: null,
  create_role: PermissionFlagsBits.ManageRoles,
  delete_role: PermissionFlagsBits.ManageRoles,
  rename_role: PermissionFlagsBits.ManageRoles,
  update_role: PermissionFlagsBits.ManageRoles,
  add_role_to_member: PermissionFlagsBits.ManageRoles,
  remove_role_from_member: PermissionFlagsBits.ManageRoles,
  create_channel: PermissionFlagsBits.ManageChannels,
  delete_channel: PermissionFlagsBits.ManageChannels,
  rename_channel: PermissionFlagsBits.ManageChannels,
  create_category: PermissionFlagsBits.ManageChannels,
  delete_category: PermissionFlagsBits.ManageChannels,
  set_channel_topic: PermissionFlagsBits.ManageChannels,
  set_slowmode: PermissionFlagsBits.ManageChannels,
  set_permissions: PermissionFlagsBits.ManageRoles,
  set_channel_permissions: PermissionFlagsBits.ManageChannels,
  ban_member: PermissionFlagsBits.BanMembers,
  unban_member: PermissionFlagsBits.BanMembers,
  kick_member: PermissionFlagsBits.KickMembers,
  timeout_member: PermissionFlagsBits.ModerateMembers,
  purge_messages: PermissionFlagsBits.ManageMessages
};

const cleanName = (name) => (name || '').replace(/^#+/, '').trim();

const findRole = (guild, name) =>
  guild.roles.cache.find((r) => r.name.toLowerCase() === cleanName(name).toLowerCase());

const findChannel = (guild, name) =>
  guild.channels.cache.find((c) => c.name.toLowerCase() === cleanName(name).toLowerCase());

const findCategory = (guild, name) =>
  guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildCategory &&
      c.name.toLowerCase() === cleanName(name).toLowerCase()
  );

const normalizeSearch = (value) =>
  String(value || '')
    .replace(/^@+/, '')
    .replace(/#\d{4}$/, '')
    .trim()
    .toLowerCase();

const getMemberSearchTerm = (parameters) =>
  parameters.user_id ||
  parameters.username ||
  parameters.name ||
  parameters.member ||
  parameters.user;

const memberMatches = (member, search) => {
  const candidates = [
    member.user.username,
    member.user.globalName,
    member.displayName,
    member.nickname,
    member.user.tag
  ]
    .filter(Boolean)
    .map(normalizeSearch);

  return candidates.some(
    (c) => c === search || c.includes(search) || search.includes(c)
  );
};

const resolveMember = async (guild, parameters) => {
  const searchTerm = getMemberSearchTerm(parameters);

  if (!searchTerm) {
    throw new Error('Member not found. Provide username or user_id in parameters.');
  }

  const idCandidate = parameters.user_id || searchTerm;
  if (/^\d{17,20}$/.test(String(idCandidate))) {
    try {
      return await guild.members.fetch(String(idCandidate));
    } catch {
      throw new Error(`No member with ID "${idCandidate}" in this server.`);
    }
  }

  const search = normalizeSearch(searchTerm);

  // Discord member search (best for username/display name lookup)
  try {
    const searched = await guild.members.fetch({ query: search, limit: 15 });
    const exact = [...searched.values()].find((m) => memberMatches(m, search));
    if (exact) return exact;
    if (searched.size === 1) return searched.first();
  } catch (err) {
    console.warn('Member search warning:', err.message);
  }

  // Fallback: load member cache
  try {
    await guild.members.fetch();
  } catch (err) {
    console.warn('Member cache fetch warning:', err.message);
  }

  let member = guild.members.cache.find((m) => memberMatches(m, search));

  if (!member) {
    member = guild.members.cache.find((m) => {
      const username = normalizeSearch(m.user.username);
      const display = normalizeSearch(m.displayName);
      return username.startsWith(search) || display.startsWith(search);
    });
  }

  if (!member) {
    throw new Error(
      `Member "${searchTerm}" not found in this server. ` +
        'Use their exact Discord username (e.g. yogi) or user ID. ' +
        'They must be a member of this server.'
    );
  }

  return member;
};

const permissionNamesToFlags = (names = []) =>
  names.reduce((acc, name) => {
    if (PermissionFlagsBits[name]) return acc | PermissionFlagsBits[name];
    return acc;
  }, 0n);

const executeDiscordAction = async (guildId, action, parameters = {}) => {
  const client = getClient();
  const guild = await client.guilds.fetch(guildId);

  if (!guild) throw new Error('Guild not found');

  const reason = parameters.reason || 'AI+ Server Bot action';

  switch (action) {
    case 'get_server_info':
      await guild.roles.fetch();
      return {
        name: guild.name,
        id: guild.id,
        memberCount: guild.memberCount,
        roleCount: guild.roles.cache.size,
        channelCount: guild.channels.cache.size,
        categoryCount: guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size
      };

    case 'list_roles': {
      await guild.roles.fetch();
      const roles = guild.roles.cache
        .filter((r) => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          name: r.name,
          id: r.id,
          color: r.hexColor,
          members: r.members.size,
          position: r.position
        }));
      return { total: roles.length, roles };
    }

    case 'list_channels': {
      const typeFilter = parameters.type || 'all';
      const channels = guild.channels.cache
        .filter((c) => c.type !== ChannelType.GuildCategory)
        .filter((c) => {
          if (typeFilter === 'text') return c.type === ChannelType.GuildText;
          if (typeFilter === 'voice') return c.type === ChannelType.GuildVoice;
          return true;
        })
        .map((c) => ({
          name: c.name,
          id: c.id,
          type: c.type === ChannelType.GuildVoice ? 'voice' : 'text',
          parent: c.parent?.name || null
        }));
      return { total: channels.length, channels };
    }

    case 'list_categories': {
      const categories = guild.channels.cache
        .filter((c) => c.type === ChannelType.GuildCategory)
        .map((c) => ({ name: c.name, id: c.id, children: c.children.cache.size }));
      return { total: categories.length, categories };
    }

    case 'list_members': {
      const limit = Math.min(parameters.limit || 50, 50);
      await guild.members.fetch({ limit });
      const members = [...guild.members.cache.values()].slice(0, limit).map((m) => ({
        username: m.user.username,
        displayName: m.displayName,
        id: m.user.id,
        roles: m.roles.cache.filter((r) => r.name !== '@everyone').map((r) => r.name)
      }));
      return { total: guild.memberCount, showing: members.length, members };
    }

    case 'get_role_info': {
      const role = findRole(guild, parameters.name);
      if (!role) throw new Error(`Role "${parameters.name}" not found`);
      return {
        name: role.name,
        id: role.id,
        color: role.hexColor,
        members: role.members.size,
        hoist: role.hoist,
        mentionable: role.mentionable,
        position: role.position
      };
    }

    case 'get_channel_info': {
      const channel = findChannel(guild, parameters.name);
      if (!channel) throw new Error(`Channel "${parameters.name}" not found`);
      return {
        name: channel.name,
        id: channel.id,
        type: channel.type === ChannelType.GuildVoice ? 'voice' : 'text',
        topic: channel.topic || null,
        parent: channel.parent?.name || null,
        slowmode: channel.rateLimitPerUser || 0
      };
    }

    case 'create_role': {
      if (!parameters.name) throw new Error('Role name is required');
      const role = await guild.roles.create({
        name: parameters.name,
        color: parameters.color || undefined,
        hoist: parameters.hoist || false,
        mentionable: parameters.mentionable || false,
        reason
      });
      return { success: true, roleId: role.id, name: role.name };
    }

    case 'delete_role': {
      const role = findRole(guild, parameters.name);
      if (!role) throw new Error(`Role "${parameters.name}" not found`);
      if (role.managed) throw new Error('Cannot delete a managed role');
      await role.delete(reason);
      return { success: true, deleted: parameters.name };
    }

    case 'rename_role': {
      const role = findRole(guild, parameters.name);
      if (!role) throw new Error(`Role "${parameters.name}" not found`);
      if (!parameters.new_name) throw new Error('new_name is required');
      await role.setName(parameters.new_name, reason);
      return { success: true, oldName: parameters.name, newName: parameters.new_name };
    }

    case 'update_role': {
      const role = findRole(guild, parameters.name);
      if (!role) throw new Error(`Role "${parameters.name}" not found`);
      await role.edit({
        color: parameters.color ?? role.color,
        hoist: parameters.hoist ?? role.hoist,
        mentionable: parameters.mentionable ?? role.mentionable,
        reason
      });
      return { success: true, name: role.name, updated: true };
    }

    case 'add_role_to_member': {
      const role = findRole(guild, parameters.role || parameters.name);
      if (!role) throw new Error(`Role not found`);
      const member = await resolveMember(guild, parameters);
      await member.roles.add(role, reason);
      return { success: true, member: member.user.tag, role: role.name };
    }

    case 'remove_role_from_member': {
      const role = findRole(guild, parameters.role || parameters.name);
      if (!role) throw new Error(`Role not found`);
      const member = await resolveMember(guild, parameters);
      await member.roles.remove(role, reason);
      return { success: true, member: member.user.tag, role: role.name };
    }

    case 'create_channel': {
      if (!parameters.name) throw new Error('Channel name is required');
      const channelType =
        parameters.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
      const parent = parameters.category ? findCategory(guild, parameters.category) : null;
      const channel = await guild.channels.create({
        name: cleanName(parameters.name),
        type: channelType,
        parent: parent?.id,
        topic: parameters.topic,
        reason
      });
      return { success: true, channelId: channel.id, name: channel.name, type: parameters.type || 'text' };
    }

    case 'delete_channel': {
      const channel = findChannel(guild, parameters.name);
      if (!channel) throw new Error(`Channel "${parameters.name}" not found`);
      await channel.delete(reason);
      return { success: true, deleted: parameters.name };
    }

    case 'rename_channel': {
      const channel = findChannel(guild, parameters.name);
      if (!channel) throw new Error(`Channel "${parameters.name}" not found`);
      if (!parameters.new_name) throw new Error('new_name is required');
      await channel.setName(cleanName(parameters.new_name), reason);
      return { success: true, oldName: parameters.name, newName: parameters.new_name };
    }

    case 'create_category': {
      if (!parameters.name) throw new Error('Category name is required');
      const category = await guild.channels.create({
        name: parameters.name,
        type: ChannelType.GuildCategory,
        reason
      });
      return { success: true, categoryId: category.id, name: category.name };
    }

    case 'delete_category': {
      const category = findCategory(guild, parameters.name);
      if (!category) throw new Error(`Category "${parameters.name}" not found`);
      await category.delete(reason);
      return { success: true, deleted: parameters.name };
    }

    case 'set_channel_topic': {
      const channel = findChannel(guild, parameters.name);
      if (!channel) throw new Error(`Channel "${parameters.name}" not found`);
      if (!channel.isTextBased()) throw new Error('Channel must be a text channel');
      await channel.setTopic(parameters.topic || '', reason);
      return { success: true, channel: channel.name, topic: parameters.topic };
    }

    case 'set_slowmode': {
      const channel = findChannel(guild, parameters.name);
      if (!channel) throw new Error(`Channel "${parameters.name}" not found`);
      if (!channel.isTextBased()) throw new Error('Channel must be a text channel');
      const seconds = Math.min(Math.max(parameters.seconds ?? 0, 0), 21600);
      await channel.setRateLimitPerUser(seconds, reason);
      return { success: true, channel: channel.name, slowmode: seconds };
    }

    case 'set_permissions': {
      const roleName = parameters.role || parameters.name;
      const role = findRole(guild, roleName);
      if (!role) throw new Error(`Role "${roleName}" not found`);

      if (parameters.admin) {
        await role.setPermissions(PermissionFlagsBits.Administrator, reason);
      } else if (parameters.permission_bits) {
        await role.setPermissions(BigInt(parameters.permission_bits), reason);
      } else if (parameters.permissions) {
        const flags = Object.entries(parameters.permissions).reduce((acc, [key, value]) => {
          if (value && PermissionFlagsBits[key]) return acc | PermissionFlagsBits[key];
          return acc;
        }, 0n);
        await role.setPermissions(flags, reason);
      } else {
        throw new Error('Provide admin, permission_bits, or permissions object');
      }
      return { success: true, role: roleName, updated: true };
    }

    case 'set_channel_permissions': {
      const channel = findChannel(guild, parameters.channel || parameters.name);
      const role = findRole(guild, parameters.role);
      if (!channel) throw new Error('Channel not found');
      if (!role) throw new Error('Role not found');

      const allow = permissionNamesToFlags(parameters.allow || []);
      const deny = permissionNamesToFlags(parameters.deny || []);
      await channel.permissionOverwrites.edit(role.id, { allow, deny }, { reason });
      return { success: true, channel: channel.name, role: role.name };
    }

    case 'ban_member': {
      const member = await resolveMember(guild, parameters);
      await member.ban({ reason, deleteMessageSeconds: 0 });
      return { success: true, banned: member.user.tag };
    }

    case 'unban_member': {
      const bans = await guild.bans.fetch();
      let userId = parameters.user_id;
      if (!userId && parameters.username) {
        const ban = bans.find(
          (b) => b.user.username.toLowerCase() === parameters.username.toLowerCase()
        );
        if (!ban) throw new Error(`No ban found for "${parameters.username}"`);
        userId = ban.user.id;
      }
      if (!userId) throw new Error('Provide user_id or username');
      await guild.members.unban(userId, reason);
      return { success: true, unbanned: userId };
    }

    case 'kick_member': {
      const member = await resolveMember(guild, parameters);
      await member.kick(reason);
      return { success: true, kicked: member.user.tag };
    }

    case 'timeout_member': {
      const member = await resolveMember(guild, parameters);
      const minutes = parameters.minutes || parameters.duration || 10;
      const ms = Math.min(minutes * 60 * 1000, 28 * 24 * 60 * 60 * 1000);
      await member.timeout(ms, reason);
      return { success: true, member: member.user.tag, timeoutMinutes: minutes };
    }

    case 'purge_messages': {
      const channel = findChannel(guild, parameters.name || parameters.channel);
      if (!channel?.isTextBased()) throw new Error('Text channel not found');
      const count = Math.min(parameters.count || 10, 100);
      const deleted = await channel.bulkDelete(count, true);
      return { success: true, channel: channel.name, deleted: deleted.size };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

const checkBotPermissions = (guild, action) => {
  const me = guild.members.me;
  if (!me) return { valid: false, reason: 'Cannot verify bot member in guild' };

  if (isReadOnlyAction(action)) return { valid: true };

  const required = REQUIRED_PERMISSIONS[action];
  if (required === undefined) return { valid: false, reason: `Unknown action: ${action}` };
  if (required === null) return { valid: true };

  if (!me.permissions.has(required)) {
    return { valid: false, reason: `Bot lacks required permission for ${action}` };
  }

  return { valid: true };
};

module.exports = {
  executeDiscordAction,
  checkBotPermissions,
  REQUIRED_PERMISSIONS
};
