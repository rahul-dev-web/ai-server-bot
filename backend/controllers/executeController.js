const { executeDiscordAction } = require('../services/discordActions');
const { verifyServerAccess } = require('../middleware/serverSecurity');
const { storeActionResult, logAuditEvent } = require('./discordController');

const executeAction = async (req, res) => {
  const { guildId, userId, discordId, action, parameters } = req.body;

  if (!guildId || !userId || !discordId || !action) {
    return res.status(400).json({
      error: 'Missing required fields: guildId, userId, discordId, action'
    });
  }

  if (!parameters || typeof parameters !== 'object') {
    return res.status(400).json({
      error: 'Missing or invalid parameters'
    });
  }

  try {
    const security = await verifyServerAccess(guildId, discordId, action);
    if (!security.valid) {
      return res.status(403).json({
        error: security.reason,
        inviteRequired: security.inviteRequired || false
      });
    }

    const result = await executeDiscordAction(guildId, action, parameters);

    await storeActionResult(guildId, userId, action, 'completed', result);
    await logAuditEvent(guildId, discordId, action, 'success');

    res.json({
      success: true,
      action,
      result
    });
  } catch (error) {
    console.error('Execute error:', error);

    await storeActionResult(guildId, userId, action, 'failed', {
      error: error.message
    });
    await logAuditEvent(guildId, discordId, action, `failed: ${error.message}`);

    res.status(500).json({
      error: error.message || 'Failed to execute action'
    });
  }
};

module.exports = { executeAction };
