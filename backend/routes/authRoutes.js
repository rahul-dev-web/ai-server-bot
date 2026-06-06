const express = require('express');
const router = express.Router();
const { discordCallback, refreshGuilds, getUserByDiscordId } = require('../controllers/authController');

// Discord OAuth Callback
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  const result = await discordCallback(code);

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    guilds: result.guilds
  });
});

// Re-fetch guilds from Discord using stored access token
router.get('/refresh-guilds', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const result = await refreshGuilds(token);

  if (!result.success) {
    return res.status(401).json({
      error: result.error,
      reauthRequired: true
    });
  }

  res.json({
    success: true,
    guilds: result.guilds
  });
});

// Get current user
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // In production, verify token with Supabase
  // For now, return mock user
  res.json({
    success: true,
    user: {
      id: 'user-id',
      username: 'test-user'
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  // In production, invalidate token
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;