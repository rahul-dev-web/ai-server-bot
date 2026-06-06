import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';
import ServerSelector from '../components/ServerSelector';
import AIWorkspace from '../components/AIWorkspace';
import ActionHistory from '../components/ActionHistory';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const syncServersFromDiscord = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return [];

    setSyncing(true);
    setSyncError(null);

    try {
      const response = await axios.get(`${backendUrl}/api/auth/refresh-guilds`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const guildList = response.data.guilds || [];
        localStorage.setItem('guilds', JSON.stringify(guildList));
        setServers(guildList);
        if (guildList.length > 0) {
          setSelectedServer((prev) => prev || guildList[0]);
        }
        return guildList;
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to sync servers from Discord';
      setSyncError(message);

      if (err.response?.data?.reauthRequired) {
        setSyncError('Session expired. Please log out and log in again.');
      }
    } finally {
      setSyncing(false);
    }

    return [];
  }, [backendUrl]);

  useEffect(() => {
    const loadDashboard = async () => {
      const userData = localStorage.getItem('user');

      if (!userData) {
        window.location.href = '/';
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      const cachedGuilds = localStorage.getItem('guilds');
      let guildList = cachedGuilds ? JSON.parse(cachedGuilds) : [];

      if (guildList.length === 0) {
        try {
          const dbResponse = await axios.get(
            `${backendUrl}/api/discord/servers?discordId=${parsedUser.discordId}`
          );

          if (dbResponse.data.success && dbResponse.data.servers?.length > 0) {
            guildList = dbResponse.data.servers.map((s) => ({
              id: s.guild_id,
              name: s.server_name,
              icon: s.server_icon
            }));
            localStorage.setItem('guilds', JSON.stringify(guildList));
          }
        } catch (err) {
          console.error('Failed to load servers from DB:', err);
        }
      }

      if (guildList.length === 0) {
        guildList = await syncServersFromDiscord();
      } else {
        setServers(guildList);
        setSelectedServer(guildList[0]);
      }

      setLoading(false);
    };

    loadDashboard();
  }, [backendUrl, syncServersFromDiscord]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🤖 AI+ Server Bot</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="username">{user.username}</span>
            {user.avatar && (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=40`}
                alt="Avatar"
                className="avatar"
              />
            )}
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <aside className="dashboard-sidebar">
          <ServerSelector
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            onSync={syncServersFromDiscord}
            syncing={syncing}
          />
        </aside>

        <section className="dashboard-content">
          {selectedServer ? (
            <>
              <AIWorkspace
                server={selectedServer}
                user={user}
                onActionExecuted={() => setHistoryRefresh((k) => k + 1)}
              />
              <ActionHistory
                server={selectedServer}
                refreshKey={historyRefresh}
              />
            </>
          ) : (
            <div className="no-server">
              <p>No servers found for account <strong>{user.username}</strong>.</p>
              <p>
                Make sure you logged in with the Discord account that <strong>owns</strong> or
                can <strong>manage</strong> the server (not a different account).
              </p>
              {syncError && <p className="sync-error">{syncError}</p>}
              <button
                className="sync-servers-btn"
                onClick={syncServersFromDiscord}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : '🔄 Sync Servers from Discord'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
