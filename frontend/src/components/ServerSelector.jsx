import React from 'react';
import '../styles/ServerSelector.css';

export default function ServerSelector({
  servers,
  selectedServer,
  onSelectServer,
  onSync,
  syncing = false
}) {
  return (
    <div className="server-selector">
      <div className="server-selector-header">
        <h3>📋 Your Servers</h3>
        {onSync && (
          <button
            className="sync-btn"
            onClick={onSync}
            disabled={syncing}
            title="Refresh from Discord"
          >
            {syncing ? '⏳' : '🔄'}
          </button>
        )}
      </div>
      <div className="server-list">
        {servers.length === 0 ? (
          <p className="no-servers">No servers found</p>
        ) : (
          servers.map((server) => (
            <button
              key={server.id}
              className={`server-item ${selectedServer?.id === server.id ? 'active' : ''}`}
              onClick={() => onSelectServer(server)}
            >
              {server.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=40`}
                  alt={server.name}
                  className="server-icon"
                />
              ) : (
                <span className="server-icon-placeholder">🎮</span>
              )}
              <span className="server-name">{server.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
