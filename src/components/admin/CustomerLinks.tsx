import React, { useState } from 'react';
import { Users, Link2, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { slugify, customerLinkFor } from '../../services/tenant';

/**
 * Customer links need no setup. Type a company name, send the URL.
 *
 * The name is read off the slug and the shared configuration is used, so adding
 * a customer is not a deploy — it is a link. The advanced section exists only
 * for the two exceptions: a display name the slug cannot produce, and a customer
 * quoted against their own carrier account.
 */
export const CustomerLinks: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [company, setCompany] = useState('');
  const [copied, setCopied] = useState(false);
  const [ownAccount, setOwnAccount] = useState(false);

  const slug = slugify(company);
  const link = slug ? customerLinkFor(slug) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* clipboard unavailable — the field is selectable */
    }
  };

  const overrideSnippet = slug
    ? JSON.stringify(
        {
          [slug]: ownAccount
            ? {
                name: company.trim(),
                credentials: {
                  voilaApiUser: '<their api-user>',
                  voilaApiToken: '<their api-token>',
                  voilaAuthCompany: '<their auth_company>',
                  billingClientName: '<their client_name>',
                  billingCustomerDcId: '<their customer_dc_id>',
                  billingCustomerKey: '<their customer_key>',
                },
              }
            : { name: company.trim() },
        },
        null,
        2
      )
    : '';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600" />
          Customer Links
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Type a company name and send them the link. Nothing to configure, nothing to deploy — the name comes from the
          URL and they get the services and rules set up here.
        </p>
      </div>

      <label className="space-y-1 block">
        <span className="block text-[11px] font-semibold text-gray-700">Company name</span>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Acme Retail"
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      {slug && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Their link</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 font-mono text-xs text-emerald-900 break-all bg-white px-2.5 py-2 rounded-lg border border-emerald-200">
                {link}
              </code>
              <button
                onClick={copy}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <p className="text-xs text-emerald-800">
            Opens the checkout with <strong>{company.trim()} Demo</strong> at the top, your services and pricing rules,
            and no way through to these settings.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
          >
            Open it now to check
          </a>
        </div>
      )}

      <details className="bg-white border border-gray-200 rounded-xl">
        <summary className="p-3 text-xs font-semibold text-gray-900 cursor-pointer select-none flex items-center gap-1.5">
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          Advanced — only if you need one of these two things
        </summary>
        <div className="px-3 pb-3 space-y-3 text-xs text-gray-600">
          <p>
            Links work without any of this. You only need an entry in{' '}
            <code className="px-1 bg-gray-100 rounded">CHECKOUT_TENANTS_JSON</code> when the name the URL produces is
            wrong — <code className="px-1 bg-gray-100 rounded">acme-uk</code> becomes "Acme Uk", not "Acme UK" — or when
            a customer should be quoted against their own carrier account.
          </p>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ownAccount}
              onChange={(e) => setOwnAccount(e.target.checked)}
              className="w-4 h-4 rounded accent-sky-600 mt-0.5"
            />
            <span>
              Quote them against <strong>their own carrier account</strong>. The credentials stay on the server and are
              never sent to a browser.
            </span>
          </label>

          {slug && (
            <textarea
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              value={overrideSnippet}
              className="w-full h-32 p-2 font-mono text-[10px] bg-gray-950 text-emerald-300 rounded-lg border border-gray-800"
            />
          )}
        </div>
      </details>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <span>
          A customer link <strong>hides</strong> these settings rather than securing them — anyone who knows the console
          URL can still reach it. Fine for a demonstrator; not a login. No credentials are exposed either way.
        </span>
      </div>
    </div>
  );
};
