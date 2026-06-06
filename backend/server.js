const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Import routes and middleware
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const discordRoutes = require('./routes/discordRoutes');
const errorHandler = require('./middleware/errorHandler');
const { userLimiter, minuteLimiter } = require('./middleware/rateLimit');
const { initDiscordBot } = require('./bot/discordBot');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(userLimiter);
app.use(minuteLimiter);

const { supabase } = require('./supabaseClient');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/discord', discordRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Backend is running ✅' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  initDiscordBot().catch((err) => {
    console.error('Discord bot failed to start:', err.message);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process first:`);
    console.error(`   PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess`);
    console.error(`   Then: Stop-Process -Id <PID> -Force`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Keep server running
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, supabase };