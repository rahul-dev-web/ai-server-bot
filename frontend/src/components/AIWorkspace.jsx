import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AIWorkspace.css';

export default function AIWorkspace({ server, user, onActionExecuted }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [botStatus, setBotStatus] = useState({ online: false, inviteUrl: null });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    checkBotStatus();
  }, []);

  const checkBotStatus = async () => {
    try {
      const result = await axios.get(`${backendUrl}/api/discord/bot-status`);
      setBotStatus(result.data);
    } catch {
      setBotStatus({ online: false, inviteUrl: null });
    }
  };

  const executeAction = async (actionData) => {
    setExecuting(true);
    try {
      const result = await axios.post(
        `${backendUrl}/api/discord/execute`,
        {
          guildId: server.id,
          userId: user.id,
          discordId: user.discordId,
          action: actionData.action,
          parameters: actionData.parameters
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setResponse({
        ...actionData,
        executed: true,
        executeResult: result.data.result
      });
      setShowConfirm(false);
      setPendingAction(null);
      onActionExecuted?.();
    } catch (error) {
      const errData = error.response?.data;
      setResponse({
        error: true,
        message: errData?.error || 'Failed to execute action',
        inviteRequired: errData?.inviteRequired
      });
      setShowConfirm(false);
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const result = await axios.post(
        `${backendUrl}/api/ai/process`,
        {
          prompt: prompt,
          guildId: server.id,
          userId: user.id
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const actionData = result.data;
      setPrompt('');

      if (actionData.requiresConfirmation) {
        setPendingAction(actionData);
        setShowConfirm(true);
        setResponse(actionData);
      } else {
        setResponse(actionData);
        await executeAction(actionData);
      }
    } catch (error) {
      setResponse({
        error: true,
        message: error.response?.data?.error || 'Failed to process request'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-workspace">
      <h2>💬 AI Workspace</h2>
      <p className="workspace-hint">
        Server: <strong>{server.name}</strong>
        <span className={`bot-status ${botStatus.online ? 'online' : 'offline'}`}>
          {botStatus.online ? ' • Bot Online' : ' • Bot Offline'}
        </span>
      </p>

      {!botStatus.online && botStatus.inviteUrl && (
        <div className="bot-invite-banner">
          <p>Invite the bot to your server to execute actions:</p>
          <a href={botStatus.inviteUrl} target="_blank" rel="noopener noreferrer">
            ➕ Invite Bot
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ai-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="e.g., Create Moderator Role, Set permissions for #general..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading || executing}
            maxLength="500"
            className="prompt-input"
          />
          <button
            type="submit"
            disabled={loading || executing || !prompt.trim()}
            className="submit-btn"
          >
            {loading ? '⏳ Processing...' : executing ? '⚡ Executing...' : '📤 Send'}
          </button>
        </div>
        <div className="char-count">{prompt.length}/500</div>
      </form>

      {response && (
        <div className="response-box">
          {response.error ? (
            <div className="error-response">
              <h3>❌ Error</h3>
              <p>{response.message}</p>
              {response.inviteRequired && botStatus.inviteUrl && (
                <a href={botStatus.inviteUrl} target="_blank" rel="noopener noreferrer">
                  Invite bot to server
                </a>
              )}
            </div>
          ) : (
            <div className="success-response">
              <h3>{response.executed ? '✅ Action Executed' : '✅ AI Response'}</h3>
              <div className="action-details">
                <div className="detail-row">
                  <label>Action:</label>
                  <code>{response.action}</code>
                </div>
                <div className="detail-row">
                  <label>Parameters:</label>
                  <pre>{JSON.stringify(response.parameters, null, 2)}</pre>
                </div>
                {response.reason && (
                  <div className="detail-row">
                    <label>Reason:</label>
                    <p>{response.reason}</p>
                  </div>
                )}
                {response.executeResult && (
                  <div className="detail-row">
                    <label>Result:</label>
                    {response.executeResult.total !== undefined && response.executeResult.roles ? (
                      <div className="result-summary">
                        <p><strong>Total Roles: {response.executeResult.total}</strong></p>
                        <pre>{JSON.stringify(response.executeResult, null, 2)}</pre>
                      </div>
                    ) : response.executeResult.memberCount !== undefined ? (
                      <div className="result-summary">
                        <p><strong>Members:</strong> {response.executeResult.memberCount} ·
                          <strong> Roles:</strong> {response.executeResult.roleCount} ·
                          <strong> Channels:</strong> {response.executeResult.channelCount}</p>
                      </div>
                    ) : (
                      <pre>{JSON.stringify(response.executeResult, null, 2)}</pre>
                    )}
                  </div>
                )}
                <div className="detail-row">
                  <label>Tokens Used:</label>
                  <span>{response.tokensUsed}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirm && pendingAction && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>⚠️ Confirm High-Risk Action</h3>
            <p>This action cannot be undone. Are you sure?</p>
            <div className="action-preview">
              <p><strong>Action:</strong> {pendingAction.action}</p>
              <p><strong>Parameters:</strong> {JSON.stringify(pendingAction.parameters)}</p>
            </div>
            <div className="confirm-buttons">
              <button
                className="btn-confirm"
                onClick={() => executeAction(pendingAction)}
                disabled={executing}
              >
                {executing ? '⏳ Executing...' : '✅ Confirm'}
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAction(null);
                }}
                disabled={executing}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
