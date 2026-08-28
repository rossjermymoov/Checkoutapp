import React, { useState } from 'react';
import { Key, Shield, Check, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { ApiCredentials } from '../../types/settings';
import { getCourierPresets, getBillingQuote } from '../../services/api';
import { DEFAULT_CUSTOMER } from '../../services/mockData';

export const CredentialsSettings: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [credentials, setCredentials] = useState<ApiCredentials>(settings.credentials);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({
    loading: false,
  });

  const handleUpdate = (field: keyof ApiCredentials, value: any) => {
    const updated = { ...credentials, [field]: value };
    setCredentials(updated);
    settings.updateCredentials({ [field]: value });
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      // Test 1: BillingAPI
      const quoteRes = await getBillingQuote(DEFAULT_CUSTOMER, credentials);
      // Test 2: HeyVoila Presets
      const presetsRes = await getCourierPresets('DPD', credentials);

      if (quoteRes.fromLive && presetsRes.fromLive) {
        setTestStatus({
          loading: false,
          success: true,
          message: `All Live APIs Connected! Live quotes retrieved (${Object.keys(quoteRes.quotes).length} services) and ${presetsRes.presets.length} DPD presets synced.`,
        });
      } else if (quoteRes.fromLive) {
        setTestStatus({
          loading: false,
          success: true,
          message: `Live BillingAPI Connected (${Object.keys(quoteRes.quotes).length} live rates). HeyVoila returned: ${presetsRes.error || 'auth required'} (using fallback presets).`,
        });
      } else if (presetsRes.fromLive) {
        setTestStatus({
          loading: false,
          success: true,
          message: `Live HeyVoila Connected (${presetsRes.presets.length} presets). BillingAPI: ${quoteRes.error || 'using mock rates'}.`,
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `API Response: ${quoteRes.error || presetsRes.error || 'Credentials rejected by live endpoints'}. System is running in fallback mode.`,
        });
      }
    } catch (e: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: e.message || 'API connection test failed',
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
              API Credentials & Endpoints
            </h3>
            <p className="text-xs text-gray-600 max-w-2xl">
              Configure your credentials for HeyVoila Presets/PUDO and BillingAPI quoting. These values are injected into API proxy requests dynamically.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-700">Mode:</span>
            <button
              type="button"
              onClick={() => handleUpdate('useLiveApi', !credentials.useLiveApi)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                credentials.useLiveApi
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
              }`}
            >
              {credentials.useLiveApi ? '● Live API Enabled' : '○ Mock / Sandbox Active'}
            </button>
          </div>
        </div>
      </div>

      {/* HeyVoila Credentials Box */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" />
              HeyVoila API Credentials (<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">app.heyvoila.io</code>)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Used for retrieving courier service presets and Drop Shop / pickup locker locations</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700">api-user</code>
            </label>
            <input
              type="text"
              value={credentials.voilaApiUser}
              onChange={(e) => handleUpdate('voilaApiUser', e.target.value)}
              placeholder="e.g. ross.jermy@gmail.com"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700">api-token</code>
            </label>
            <input
              type="password"
              value={credentials.voilaApiToken}
              onChange={(e) => handleUpdate('voilaApiToken', e.target.value)}
              placeholder="e.g. voila_sec_token"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payload: <code className="text-sky-700">auth_company</code>
            </label>
            <input
              type="text"
              value={credentials.voilaAuthCompany}
              onChange={(e) => handleUpdate('voilaAuthCompany', e.target.value)}
              placeholder="e.g. YTC"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Billing API Credentials Box */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              Billing API Credentials (<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">customer-routes/get-quote</code>)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Used for real-time rating quote calculation based on client, DC, and customer key</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700">client_name</code>
            </label>
            <input
              type="text"
              value={credentials.billingClientName}
              onChange={(e) => handleUpdate('billingClientName', e.target.value)}
              placeholder="e.g. Moov Parcel"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700">customer_dc_id</code>
            </label>
            <input
              type="text"
              value={credentials.billingCustomerDcId}
              onChange={(e) => handleUpdate('billingCustomerDcId', e.target.value)}
              placeholder="Kitloop"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-indigo-700">customer_key</code>
            </label>
            <input
              type="text"
              value={credentials.billingCustomerKey}
              onChange={(e) => handleUpdate('billingCustomerKey', e.target.value)}
              placeholder="b62e9045a42d43468840c6e07b568fcd"
              className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Endpoint URL: <code className="text-indigo-700">POST Get Quote</code>
          </label>
          <input
            type="text"
            value={credentials.billingEndpointUrl}
            onChange={(e) => handleUpdate('billingEndpointUrl', e.target.value)}
            placeholder="https://production.billingapi.co.uk/api/customer-routes/get-quote"
            className="w-full px-3.5 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Test Connection Button & Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-xs">
          {testStatus.message && (
            <div className={`flex items-center gap-1.5 ${testStatus.success ? 'text-emerald-700' : 'text-amber-700'}`}>
              {testStatus.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
              <span>{testStatus.message}</span>
            </div>
          )}
          {!testStatus.message && (
            <span className="text-gray-500">Test and verify your credentials with live endpoints</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testStatus.loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
          <span>Test API Connection</span>
        </button>
      </div>
    </div>
  );
};
