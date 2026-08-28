import React, { useState, useEffect } from 'react';
import { Key, Shield, Check, RefreshCw, AlertCircle, Lock, Save, Database, Send, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { ApiCredentials } from '../../types/settings';
import { getBillingQuote } from '../../services/api';
import { DEFAULT_CUSTOMER } from '../../services/mockData';

export const CredentialsSettings: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [credentials, setCredentials] = useState<ApiCredentials>(settings.credentials);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    quotes?: Record<string, number>;
    raw?: any;
    httpStatus?: number;
  }>({
    loading: false,
  });
  const [showRawJson, setShowRawJson] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    return settings.subscribe(() => {
      setCredentials(settings.credentials);
    });
  }, [settings]);

  const handleUpdate = (field: keyof ApiCredentials, value: any) => {
    const updated = { ...credentials, [field]: value };
    setCredentials(updated);
    settings.updateCredentials({ [field]: value });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleManualSave = async () => {
    await settings.updateCredentials(credentials);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleTestBillingQuote = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await getBillingQuote(DEFAULT_CUSTOMER, credentials);
      if (res.fromLive) {
        setTestStatus({
          loading: false,
          success: true,
          httpStatus: 200,
          message: `Live Billing API returned ${Object.keys(res.quotes).length} rated service(s) successfully!`,
          quotes: res.quotes,
          raw: res.rawResponse,
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          httpStatus: 500,
          message: res.error || 'Failed to receive live quote from endpoint. Operating on fallback rates.',
          quotes: res.quotes,
          raw: res.rawResponse,
        });
      }
    } catch (e: any) {
      setTestStatus({
        loading: false,
        success: false,
        httpStatus: 500,
        message: e.message || 'Billing API request failed.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-sky-600" />
              Billing & Courier API Credentials
            </h3>
            <p className="text-xs text-gray-600 max-w-2xl">
              Configure your Billing API authentication and quoting endpoints. Credentials automatically persist across sessions and server restarts.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-700">Rating Mode:</span>
            <button
              type="button"
              onClick={() => handleUpdate('useLiveApi', !credentials.useLiveApi)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                credentials.useLiveApi
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${credentials.useLiveApi ? 'text-white' : 'text-amber-800'}`} />
              <span>{credentials.useLiveApi ? 'Live Billing API' : 'Sandbox / Mock Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Box: Billing API Credentials */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              Live Billing API Configuration
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Live quote calculation endpoint used at checkout for courier rating
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">
              POST Endpoint
            </span>
          </div>
        </div>

        {/* Auth Headers */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700 font-mono">client_name</code>
            </label>
            <input
              type="text"
              value={credentials.billingClientName || ''}
              onChange={(e) => handleUpdate('billingClientName', e.target.value)}
              placeholder="e.g. Moov Parcel"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700 font-mono">customer_dc_id</code>
            </label>
            <input
              type="text"
              value={credentials.billingCustomerDcId || ''}
              onChange={(e) => handleUpdate('billingCustomerDcId', e.target.value)}
              placeholder="Kitloop"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700 font-mono">customer_key</code>
            </label>
            <input
              type="text"
              value={credentials.billingCustomerKey || ''}
              onChange={(e) => handleUpdate('billingCustomerKey', e.target.value)}
              placeholder="Leave blank to use the server-configured key"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Endpoint & Payload Option */}
        <div className="grid sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Billing Endpoint URL (<span className="text-indigo-600 font-bold">Must be POST</span>)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-xs font-bold font-mono">
                POST
              </span>
              <input
                type="text"
                value={credentials.billingEndpointUrl || ''}
                onChange={(e) => handleUpdate('billingEndpointUrl', e.target.value)}
                placeholder="https://production.billingapi.co.uk/api/customer-routes/get-quote"
                className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-r-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payload: <code className="text-indigo-700 font-mono">auth_company</code> (Optional)
            </label>
            <input
              type="text"
              value={credentials.voilaAuthCompany || ''}
              onChange={(e) => handleUpdate('voilaAuthCompany', e.target.value)}
              placeholder='Leave blank "" or enter company'
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Live Test Quote Section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                Live Quote Verification
              </p>
              <p className="text-[11px] text-gray-500">
                Execute a live POST request to verify your credentials and view live quoted pricing from Billing API
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestBillingQuote}
              disabled={testStatus.loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
              <span>{testStatus.loading ? 'Requesting Quote...' : '⚡ Test Live POST Quote'}</span>
            </button>
          </div>

          {/* Test Status Output Box */}
          {testStatus.message && (
            <div className={`mt-3 p-4 rounded-xl border text-xs space-y-3 ${
              testStatus.success
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testStatus.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold">{testStatus.message}</span>
                </div>

                {testStatus.httpStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    testStatus.success ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                  }`}>
                    HTTP {testStatus.httpStatus}
                  </span>
                )}
              </div>

              {/* Parsed Live Quotes */}
              {testStatus.quotes && Object.keys(testStatus.quotes).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-emerald-200/60">
                  <p className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                    Quoted Rates Received:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(testStatus.quotes).map(([code, rate]) => (
                      <span
                        key={code}
                        className="bg-white border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <span>{code}:</span>
                        <span className="text-emerald-600">£{Number(rate).toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON Accordion */}
              {testStatus.raw && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-[11px] font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
                  >
                    <span>{showRawJson ? 'Hide' : 'Show'} Raw API Response JSON</span>
                    {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showRawJson && (
                    <pre className="mt-2 bg-gray-950 text-emerald-300 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(testStatus.raw, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Box: Voila / Presets Credentials (Optional) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" />
              HeyVoila API Credentials (Optional)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Only required if fetching direct courier presets or pickup locations from <code className="text-gray-700 bg-gray-100 px-1 py-0.5 rounded">app.heyvoila.io</code>
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700 font-mono">api-user</code> (Optional)
            </label>
            <input
              type="text"
              value={credentials.voilaApiUser || ''}
              onChange={(e) => handleUpdate('voilaApiUser', e.target.value)}
              placeholder="e.g. user@domain.com"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700 font-mono">api-token</code> (Optional)
            </label>
            <input
              type="password"
              value={credentials.voilaApiToken || ''}
              onChange={(e) => handleUpdate('voilaApiToken', e.target.value)}
              placeholder="Optional token"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Footer Save Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-xs">
          {savedFeedback ? (
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold animate-pulse">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Credentials saved to permanent storage!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span>Auto-saved to permanent storage & disk</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleManualSave}
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
