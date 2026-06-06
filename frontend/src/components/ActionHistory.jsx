import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ActionHistory.css';

export default function ActionHistory({ server, refreshKey = 0 }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [server.id, refreshKey]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

      const response = await axios.get(
        `${backendUrl}/api/discord/actions/${server.id}?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setActions(response.data.actions);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="action-history">
      <h2>📋 Recent Actions</h2>

      {loading ? (
        <div className="loading">Loading history...</div>
      ) : actions.length === 0 ? (
        <div className="empty-state">
          <p>No actions yet. Try creating one!</p>
        </div>
      ) : (
        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{new Date(action.created_at).toLocaleString()}</td>
                  <td>
                    <code>{action.action_type}</code>
                  </td>
                  <td>
                    <span className={`status-${action.status}`}>{action.status}</span>
                  </td>
                  <td>
                    {action.result
                      ? JSON.stringify(action.result).substring(0, 40) + '...'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="refresh-btn" onClick={loadHistory}>
        🔄 Refresh
      </button>
    </div>
  );
}
