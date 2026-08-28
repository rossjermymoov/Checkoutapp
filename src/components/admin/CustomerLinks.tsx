import React, { useState, useEffect, useMemo } from 'react';
import { Users, Link2, AlertTriangle, Check } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { slugify, customerLinkFor } from '../../services/tenant';

/**
 * Build a per-customer demo link from the configuration currently loaded in the
 * console: pick a company name, get the JSON to add to CHECKOUT_TENANTS_JSON on
 * the host, and the URL to send.
 */
export const CustomerLinks: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [company, setCompany] = useState('');
  const [tagline, setTagline] = useState('');
  const [ownAccount, setOwnAccount] = useState(false);
  const [existing, setExisting] = useState<Array<{ slug: string; name: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => settings.subscribe(() => setTick((t) => t + 1)), [settings]);

  useEffect(() => {
    fetch('/api/proxy/tenants')
      .then((r) => (r.ok ? r.json() : { tenants: [] }))
      .then((b) => setExisting(b.tenants || []))
      .catch(() => setExisting([]));
  }, []);

  const slug = slugify(company);

  const snippet = useMemo(() => {
    if (!slug) return '';
    const record: any = {
      name: company.trim(),
      settings: JSON.parse(settings.exportConfiguration()),
    };
    if (tagline.trim()) record.tagline = tagline.trim();
    if (ownAccount) {
      record.credentials = {
        voilaApiUser: '<their Voila api-user>',
        voilaApiToken: '<their Voila api-token>',
        voilaAuthCompany: '<their auth_company>',
        billingClientName: '<their billing client_name>',
        billingCustomerDcId: '<their customer_dc_id>',
        billingCustomerKey: '<their customer_key>',
      };
    }
    return JSON.stringify({ [slug]: record }, null, 2);
  }, [slug, company, tagline, ownAccount, settings]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* clipboard unavailable — the textarea is selectable */
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600" />
          Customer Links
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Give a customer a link that opens the checkout with their configuration and their name, and no route to these
          settings.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="block text-[11px] font-semibold text-gray-700">Company name</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Acme Retail"
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-semibold text-gray-700">Strapline (optional)</span>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Shown under the name"
            className={inputClass}
          />
        </label>
      </div>

      {slug && (
        <>
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5">
            <p className="text-xs text-sky-900">
              Header will read <strong>{company.trim()} Demo</strong>
            </p>
            <p className="text-xs text-sky-900 flex items-center gap-1.5 break-all">
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
              <code className="font-mono">{customerLinkFor(slug)}</code>
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={ownAccount}
              onChange={(e) => setOwnAccount(e.target.checked)}
              className="w-4 h-4 rounded accent-sky-600 mt-0.5"
            />
            <span>
              Quote this customer against <strong>their own carrier account</strong> rather than yours. Adds a
              credentials block to fill in — it stays on the server and is never sent to the browser.
            </span>
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-700">
                Add to <code className="px-1 bg-gray-100 rounded">CHECKOUT_TENANTS_JSON</code> on your host
              </span>
              <button
                onClick={copy}
                className="text-[11px] px-2.5 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              value={snippet}
              className="w-full h-44 p-2 font-mono text-[10px] bg-gray-950 text-emerald-300 rounded-lg border border-gray-800"
            />
            <p className="text-[11px] text-gray-500">
              That variable holds every customer in one object, so merge this entry alongside any already there.
            </p>
          </div>
        </>
      )}

      {existing.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-gray-700">Configured on this host</span>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
            {existing.map((t) => (
              <div key={t.slug} className="p-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-900">{t.name}</span>
                <a
                  href={customerLinkFor(t.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-sky-600 hover:text-sky-800 break-all"
                >
                  /c/{t.slug}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <span>
          A customer link <strong>hides</strong> the console rather than securing it. The API routes remain reachable to
          anyone who knows the URLs, so treat a link as unlisted, not private. No secret is exposed either way —
          credentials are resolved on the server and never sent to the browser — but don't put anything in a customer's
          record you would mind that customer reading.
        </span>
      </div>
    </div>
  );
};
