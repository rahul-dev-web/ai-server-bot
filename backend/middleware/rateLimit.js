const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// Per-user rate limiter
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.REQUESTS_PER_HOUR || 50,
  message: 'Too many requests from this user',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  keyGenerator: (req, res) => {
    const userId =
      req.query.userId ||
      req.body?.userId ||
      req.body?.discordId;
    if (userId) {
      return `user-${userId}`;
    }
    return `ip-${ipKeyGenerator(req)}`;
  }
});

// Per-minute rate limiter
const minuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.REQUESTS_PER_MINUTE || 30,
  message: 'Too many requests in a minute',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  keyGenerator: (req, res) => {
    return `minute-${ipKeyGenerator(req)}`;
  }
});

// Per-server limiter - returns proper middleware
const serverLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per guild per hour
  message: 'Too many requests from this server',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Only apply to requests with guild ID
    const hasGuildId = req.query.guildId || req.body.guildId;
    return !hasGuildId;
  },
  keyGenerator: (req, res) => {
    const guildId = req.query.guildId || req.body.guildId;
    if (guildId) {
      return `guild-${guildId}`;
    }
    // Fallback
    return `guild-fallback-${ipKeyGenerator(req)}`;
  }
});

module.exports = {
  userLimiter,
  minuteLimiter,
  serverLimiter
};