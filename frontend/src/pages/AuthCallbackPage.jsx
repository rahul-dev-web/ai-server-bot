import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/AuthCallback.css';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(`Discord auth error: ${oauthError}`);
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Already logged in from a previous callback (React StrictMode runs effects twice)
    const existingUser = localStorage.getItem('user');
    if (existingUser) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const authenticate = async () => {
      handledRef.current = true;

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

        const response = await axios.get(
          `${backendUrl}/api/auth/discord/callback?code=${code}`
        );

        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('guilds', JSON.stringify(response.data.guilds));

          navigate('/dashboard', { replace: true });
        } else {
          handledRef.current = false;
          setError(response.data.error || 'Authentication failed');
        }
      } catch (err) {
        // If first request already succeeded, don't kick user back to login
        if (localStorage.getItem('user')) {
          navigate('/dashboard', { replace: true });
          return;
        }

        handledRef.current = false;
        console.error('Auth error:', err);
        setError(err.response?.data?.error || 'Authentication failed. Please try again.');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    authenticate();
  }, [navigate, searchParams]);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-card">
        {error ? (
          <div className="error-state">
            <h2>❌ Authentication Error</h2>
            <p>{error}</p>
            <p className="redirect-info">Redirecting to login...</p>
          </div>
        ) : (
          <div className="loading-state">
            <div className="spinner"></div>
            <h2>🔄 Authenticating...</h2>
            <p>Please wait while we set up your account</p>
          </div>
        )}
      </div>
    </div>
  );
}