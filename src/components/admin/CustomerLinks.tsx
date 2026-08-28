import React, { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Check, Trash2, AlertTriangle, Plus, ExternalLink, HardDrive } from 'lucide-react';
import { adminHeaders } from '../../services/adminAuth';
import { customerLinkFor } from '../../services/tenant';

interface SavedLink {
  token: string;
  company: string;
  createdAt: string | null;
  fromEnvironment: boolean;
}

/**
 * Create and manage customer demo links.
 *
 * Each link is a random 20-character token, so a URL cannot be guessed or
 * enumerated by trying company names. Links are stored on the server, listed
 * here, and can be revoked.
 */
export const CustomerLinks: React.FC = () => {
  const [company, setCompany] = useState('');
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [persistent, setPersistent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/links', { headers: adminHeaders() });
      if (!res.ok) {
        setError(res.status === 401 ? 'Not authorised.' : 'Could not load saved links.');
        setLinks([]);
      } else {
        const body = await res.json();
        setLinks(body.links || []);
        setPersistent(Boolean(body.persistent));
        setError(null);
      }
    } catch (e) {
      setError('Could not reach the server.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ company: company.trim() }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error || 'Could not create the link.');
      else {
        setCompany('');
        await load();
        setCopiedToken(body.token);
        navigator.clipboard?.writeText(customerLinkFor(body.token)).catch(() => {});
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err) {
      setError('Could not reach the server.');
    }
    setCreating(false);
  };

  const revoke = async (token: string) => {
    try {
      const res = await fetch(`/api/proxy/links/${token}`, { method: 'DELETE', headers: adminHeaders() });
      if (!res.ok) setError('Could not revoke that link.');
      else await load();
    } catch (e) {
      setError('Could not reach the server.');
    }
    setConfirmRevoke(null);
  };

  const copy = (token: string) => {
    navigator.clipboard?.writeText(customerLinkFor(token)).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600" />
          Customer Links
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Each link is a random token that cannot be guessed. The customer sees their name and your services, with no
          route to these settings.
        </p>
      </div>

      <form onSubmit={create} className="flex gap-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name, e.g. Acme Retail"
          className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={creating || !company.trim()}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create link'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">{error}</div>
      )}

      {!persistent && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
          <HardDrive className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <span>
            <strong>Links will not survive a redeploy.</strong> They are being written inside the container, which is
            replaced on every deploy. Attach a volume on your host and set{' '}
            <code className="px-1 bg-amber-100 rounded">LINKS_FILE</code> to a path on it, e.g.{' '}
            <code className="px-1 bg-amber-100 rounded">/data/links.json</code>.
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : links.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl">
          No customer links yet. Create one above.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white overflow-hidden">
          {links.map((l) => (
            <div key={l.token} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{l.company}</span>
                  {l.fromEnvironment && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                      from environment
                    </span>
                  )}
                </div>
                <code className="text-[11px] font-mono text-gray-500 break-all">{customerLinkFor(l.token)}</code>
                {l.createdAt && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Created {new Date(l.createdAt).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => copy(l.token)}
                  title="Copy link"
                  className="p-2 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-gray-50"
                >
                  {copiedToken === l.token ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={customerLinkFor(l.token)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open"
                  className="p-2 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {!l.fromEnvironment &&
                  (confirmRevoke === l.token ? (
                    <button
                      onClick={() => revoke(l.token)}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmRevoke(l.token)}
                      title="Revoke link"
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2 text-[11px] text-gray-600">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-gray-400 mt-0.5" />
        <span>
          A revoked link stops working immediately. Anyone still holding it gets the same "not found" as a made-up one,
          so links cannot be enumerated by trying company names.
        </span>
      </div>
    </div>
  );
};
