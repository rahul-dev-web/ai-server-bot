const READ_ONLY_ACTIONS = [
  'get_server_info',
  'list_roles',
  'list_channels',
  'list_categories',
  'list_members',
  'get_role_info',
  'get_channel_info'
];

const HIGH_RISK_ACTIONS = [
  'delete_role',
  'delete_channel',
  'delete_category',
  'ban_member',
  'kick_member',
  'purge_messages'
];

const MEDIUM_RISK_ACTIONS = [
  'timeout_member',
  'unban_member',
  'set_permissions',
  'set_channel_permissions'
];

const ACTION_DEFINITIONS = {
  // ── Read-only (safe, auto-run) ──
  get_server_info: {
  description: 'Get server name, member count, role count, channel count. Use for "server stats", "server info".',
  parameters: '{}',
  example: '{ "action": "get_server_info", "parameters": {} }'
  },
  list_roles: {
  description: 'List all roles with member counts. Use for "total roles", "how many roles", "list roles", "check roles".',
  parameters: '{}',
  example: '{ "action": "list_roles", "parameters": {} }'
  },
  list_channels: {
  description: 'List all text and voice channels.',
  parameters: '{ "type": "text|voice|all" }',
  example: '{ "action": "list_channels", "parameters": { "type": "all" } }'
  },
  list_categories: {
  description: 'List all channel categories.',
  parameters: '{}',
  example: '{ "action": "list_categories", "parameters": {} }'
  },
  list_members: {
  description: 'List server members (max 50).',
  parameters: '{ "limit": 50 }',
  example: '{ "action": "list_members", "parameters": { "limit": 20 } }'
  },
  get_role_info: {
  description: 'Get details of a specific role by name.',
  parameters: '{ "name": "RoleName" }',
  example: '{ "action": "get_role_info", "parameters": { "name": "Moderator" } }'
  },
  get_channel_info: {
  description: 'Get details of a channel by name.',
  parameters: '{ "name": "general" }',
  example: '{ "action": "get_channel_info", "parameters": { "name": "general" } }'
  },

  // ── Roles ──
  create_role: {
  description: 'Create a new role.',
  parameters: '{ "name": "RoleName", "color": 9807270 }',
  example: '{ "action": "create_role", "parameters": { "name": "Moderator", "color": 3447003 } }'
  },
  delete_role: {
  description: 'Delete a role by name.',
  parameters: '{ "name": "RoleName" }',
  example: '{ "action": "delete_role", "parameters": { "name": "OldRole" } }'
  },
  rename_role: {
  description: 'Rename an existing role.',
  parameters: '{ "name": "OldName", "new_name": "NewName" }',
  example: '{ "action": "rename_role", "parameters": { "name": "Mod", "new_name": "Moderator" } }'
  },
  update_role: {
  description: 'Update role color or hoist settings.',
  parameters: '{ "name": "RoleName", "color": 9807270, "hoist": true }',
  example: '{ "action": "update_role", "parameters": { "name": "VIP", "color": 15844367 } }'
  },
  add_role_to_member: {
  description: 'Assign a role to a member.',
  parameters: '{ "role": "RoleName", "username": "user" }',
  example: '{ "action": "add_role_to_member", "parameters": { "role": "Moderator", "username": "john" } }'
  },
  remove_role_from_member: {
  description: 'Remove a role from a member.',
  parameters: '{ "role": "RoleName", "username": "user" }',
  example: '{ "action": "remove_role_from_member", "parameters": { "role": "Moderator", "username": "john" } }'
  },

  // ── Channels ──
  create_channel: {
  description: 'Create a text or voice channel. Strip # from names.',
  parameters: '{ "name": "channel-name", "type": "text|voice", "category": "CategoryName" }',
  example: '{ "action": "create_channel", "parameters": { "name": "announcements", "type": "text" } }'
  },
  delete_channel: {
  description: 'Delete a channel by name.',
  parameters: '{ "name": "channel-name" }',
  example: '{ "action": "delete_channel", "parameters": { "name": "spam" } }'
  },
  rename_channel: {
  description: 'Rename a channel.',
  parameters: '{ "name": "old-name", "new_name": "new-name" }',
  example: '{ "action": "rename_channel", "parameters": { "name": "general", "new_name": "chat" } }'
  },
  create_category: {
  description: 'Create a new channel category.',
  parameters: '{ "name": "Category Name" }',
  example: '{ "action": "create_category", "parameters": { "name": "Staff" } }'
  },
  delete_category: {
  description: 'Delete a category by name.',
  parameters: '{ "name": "Category Name" }',
  example: '{ "action": "delete_category", "parameters": { "name": "Old Category" } }'
  },
  set_channel_topic: {
  description: 'Set topic/description of a text channel.',
  parameters: '{ "name": "channel-name", "topic": "Channel topic text" }',
  example: '{ "action": "set_channel_topic", "parameters": { "name": "rules", "topic": "Read before chatting" } }'
  },
  set_slowmode: {
  description: 'Set slowmode delay in seconds for a channel (0 to disable).',
  parameters: '{ "name": "channel-name", "seconds": 5 }',
  example: '{ "action": "set_slowmode", "parameters": { "name": "general", "seconds": 10 } }'
  },

  // ── Permissions ──
  set_permissions: {
  description: 'Set permissions on a role.',
  parameters: '{ "role": "RoleName", "admin": true } OR { "role": "RoleName", "permissions": { "ManageMessages": true } }',
  example: '{ "action": "set_permissions", "parameters": { "role": "Mod", "admin": false, "permissions": { "KickMembers": true, "BanMembers": true } } }'
  },
  set_channel_permissions: {
  description: 'Set channel-specific permissions for a role.',
  parameters: '{ "channel": "channel-name", "role": "RoleName", "allow": ["ViewChannel","SendMessages"], "deny": [] }',
  example: '{ "action": "set_channel_permissions", "parameters": { "channel": "staff", "role": "Member", "deny": ["ViewChannel"] } }'
  },

  // ── Moderation ──
  ban_member: {
  description: 'Ban a member from the server.',
  parameters: '{ "username": "user" } OR { "user_id": "discord_id" }',
  example: '{ "action": "ban_member", "parameters": { "username": "spammer" } }'
  },
  unban_member: {
  description: 'Unban a user by username or user ID.',
  parameters: '{ "username": "user" } OR { "user_id": "discord_id" }',
  example: '{ "action": "unban_member", "parameters": { "user_id": "123456789" } }'
  },
  kick_member: {
  description: 'Kick a member from the server. Use their Discord username (not display name if different).',
  parameters: '{ "username": "exact_username" } OR { "user_id": "discord_id" }',
  example: '{ "action": "kick_member", "parameters": { "username": "yogi" } }'
  },
  timeout_member: {
  description: 'Timeout/mute a member. Duration in minutes.',
  parameters: '{ "username": "user", "minutes": 10 }',
  example: '{ "action": "timeout_member", "parameters": { "username": "user", "minutes": 60 } }'
  },
  purge_messages: {
  description: 'Delete recent messages in a channel.',
  parameters: '{ "name": "channel-name", "count": 10 }',
  example: '{ "action": "purge_messages", "parameters": { "name": "spam", "count": 50 } }'
  }
};

const ALLOWED_ACTIONS = Object.keys(ACTION_DEFINITIONS);

const isReadOnlyAction = (action) => READ_ONLY_ACTIONS.includes(action);
const isHighRiskAction = (action) => HIGH_RISK_ACTIONS.includes(action);
const requiresConfirmation = (action) =>
  isHighRiskAction(action) || MEDIUM_RISK_ACTIONS.includes(action);

const buildPromptActionList = () =>
  ALLOWED_ACTIONS.map((name) => {
    const def = ACTION_DEFINITIONS[name];
    return `- ${name}: ${def.description}\n  parameters: ${def.parameters}`;
  }).join('\n');

module.exports = {
  ACTION_DEFINITIONS,
  ALLOWED_ACTIONS,
  READ_ONLY_ACTIONS,
  HIGH_RISK_ACTIONS,
  MEDIUM_RISK_ACTIONS,
  isReadOnlyAction,
  isHighRiskAction,
  requiresConfirmation,
  buildPromptActionList
};
