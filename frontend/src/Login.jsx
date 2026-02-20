import { useState } from 'react';
import * as api from './api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(password);
      if (data?.token) {
        onLogin();
      } else {
        setError('Wrong password');
      }
    } catch {
      setError('Connection failed');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-wa-dark">
      <div className="w-full max-w-sm">
        {/* Green header bar */}
        <div className="bg-wa-green h-32 absolute top-0 left-0 right-0" />

        <div className="relative bg-white rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-wa-green flex items-center justify-center">
              <svg viewBox="0 0 39 39" width="50" height="50" fill="white">
                <path d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/>
                <path fill="#00a884" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-1.6-2.4-2.3-5.2-2.3-8 0-8.4 6.8-15.2 15.2-15.2 4.1 0 7.9 1.6 10.8 4.5 2.8 2.9 4.5 6.7 4.4 10.8-.1 8.3-6.9 15.1-15.1 15.1zm8.3-11.4c-.5-.2-2.7-1.3-3.1-1.5-.4-.2-.7-.2-1 .2s-1.2 1.5-1.5 1.8c-.3.3-.5.3-1 .1s-2-.7-3.8-2.4c-1.4-1.3-2.4-2.8-2.6-3.3-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-1-2.4-1.4-3.4-.4-.9-.7-.8-1-.8h-.9c-.3 0-.8.1-1.2.6s-1.6 1.5-1.6 3.8 1.6 4.4 1.8 4.7c.2.3 3.2 4.9 7.8 6.8 1.1.5 1.9.7 2.6.9 1.1.3 2 .3 2.8.2.9-.1 2.7-1.1 3.1-2.2.4-1.1.4-2 .3-2.2-.2-.2-.4-.3-.9-.5z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-center text-gray-700 text-xl font-medium mb-2">BHD Chat</h1>
          <p className="text-center text-gray-400 text-sm mb-6">Enter password to continue</p>

          <form onSubmit={handleSubmit}>
            <input
              type="password" autocomplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-wa-green text-gray-700 mb-4"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-lg bg-wa-green text-white font-medium hover:bg-wa-greenDark transition disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
