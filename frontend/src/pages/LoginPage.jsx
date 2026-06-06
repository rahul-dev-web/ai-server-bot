import React from 'react';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;
  const scope = 'identify email guilds';
  
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🤖 AI+ Server Bot</h1>
          <p className="subtitle">Automate your Discord server with AI</p>
        </div>
        
        <a href={oauthUrl} className="login-button">
          <span className="button-icon">🎮</span>
          <span className="button-text">Login with Discord</span>
        </a>
        
        <div className="features">
          <h3>✨ Features</h3>
          <ul>
            <li>
              <span className="feature-icon">📊</span>
              <span>Server stats, roles & channel info</span>
            </li>
            <li>
              <span className="feature-icon">⚡</span>
              <span>Roles, channels & categories</span>
            </li>
            <li>
              <span className="feature-icon">🔐</span>
              <span>Permissions & moderation tools</span>
            </li>
            <li>
              <span className="feature-icon">📋</span>
              <span>Action history & audit logs</span>
            </li>
          </ul>
        </div>

        <div className="footer">
          <p>Powered by Groq Llama 3.1 8B Instant</p>
        </div>
      </div>
    </div>
  );
}