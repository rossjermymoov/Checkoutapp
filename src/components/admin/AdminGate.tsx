import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { getAdminKey, setAdminKey, verifyAdminKey, isAdminRequired } from '../../services/adminAuth';

/**
 * Wraps the console. When ADMIN_PASSWORD is set on the server, asks for it
 * before rendering anything; when it isn't, renders straight through and says
 * the console is unprotected.
 */
export const AdminGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'checking' | 'open' | 'locked' | 'unlocked'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await isAdminRequired())) {
        setState('open');
        return;
      }
      const existing = getAdminKey();
      if (existing && (await verifyAdminKey(existing))) {
        setState('unlocked');
        return;
      }
      setAdminKey(null);
      setState('locked');
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await verifyAdminKey(password);
    setBusy(false);
    if (ok) {
      setAdminKey(password);
      setState('unlocked');
    } else {
      setError('That password was not accepted.');
    }
  };

  if (state === 'checking') {
    return (
      <div className="p-12 text-center">
        <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (state === 'locked') {
    return (
      <div className="max-w-sm mx-auto mt-16 px-4">
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Carrier settings</h2>
              <p className="text-xs text-gray-500">Enter the console password to continue.</p>
            </div>
          </div>

          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {error && (
            <p className="text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="w-full py-2.5 bg-gray-900 hover:bg-black disabled:opacity-40 text-white rounded-lg text-sm font-semibold"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {state === 'open' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>This console is unprotected.</strong> Set an <code className="px-1 bg-amber-100 rounded">ADMIN_PASSWORD</code>{' '}
              environment variable on your host so only you can reach the carrier settings.
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
};
