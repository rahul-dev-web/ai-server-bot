const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const router = express.Router();
const { getUserServers, getActionHistory } = require('../controllers/discordController');
const { executeAction } = require('../controllers/executeController');
const { isBotReady } = require('../bot/discordBot');

// GET /api/discord/servers
router.get('/servers', async (req, res) => {
  const { discordId } = req.query;

  if (!discordId) {
    return res.status(400).json({ error: 'Discord ID required' });
  }

  try {
    const result = await getUserServers(discordId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/discord/execute
router.post('/execute', executeAction);

// GET /api/discord/bot-status
router.get('/bot-status', (req, res) => {
  res.json({
    online: isBotReady(),
    inviteUrl: getBotInviteUrl()
  });
});

// GET /api/discord/bot-invite
router.get('/bot-invite', (req, res) => {
  res.json({ url: getBotInviteUrl() });
});

function getBotInviteUrl() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return null;

  const permissions =
    PermissionFlagsBits.ManageRoles |
    PermissionFlagsBits.ManageChannels |
    PermissionFlagsBits.KickMembers |
    PermissionFlagsBits.BanMembers |
    PermissionFlagsBits.ModerateMembers |
    PermissionFlagsBits.ManageMessages |
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.ReadMessageHistory;

  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot`;
}

// GET /api/discord/actions/:guildId
router.get('/actions/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await getActionHistory(guildId, parseInt(limit), parseInt(offset));

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;