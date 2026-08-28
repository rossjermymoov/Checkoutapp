import React, { useState } from 'react';
import { Key, ShieldCheck, Check, AlertCircle, RefreshCw, Server, Globe, Lock, Sliders } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { getCourierPresets } from '../../services/api';

export const CredentialsSettings: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message?: string; success?: boolean }>({
    loading: false,
  });

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const credentials = settings.credentials;

  const handleUpdate = (field: string, value: any) => {
    settings.updateCredentials({ [field]: value });
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await getCourierPresets('DPD', credentials);
      if (res.error) {
        setTestStatus({
          loading: false,
          success: false,
          message: `Connection returned: ${res.error}. Presets loaded via mock fallback.`,
        });
      } else {
        setTestStatus({
          loading: false,
          success: true,
          message: `Connection successful! Fetched ${res.presets.length} presets for DPD (${res.fromLive ? 'Live Voila API' : 'Sandbox Mode'}).`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Failed: ${err.message}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-sky-600" />
              API Credentials & Endpoint Variables
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Configure authentication tokens and identifiers for HeyVoila and BillingAPI
            </p>
          </div>

          {/* Live vs Sandbox Switch */}
          <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Execution Mode:</span>
            <button
              type="button"
              onClick={() => handleUpdate('useLiveApi', false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !credentials.useLiveApi
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sandbox / Mock
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('useLiveApi', true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                credentials.useLiveApi
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live API
            </button>
          </div>
        </div>

        {credentials.useLiveApi ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Live Mode Active:</strong> Outgoing requests are proxied directly to <code className="bg-emerald-100 px-1 rounded">https://app.heyvoila.io</code> and <code className="bg-emerald-100 px-1 rounded">https://production.billingapi.co.uk</code>.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Sandbox Mode Active:</strong> Simulates instant carrier responses matching exact Voila & BillingAPI schemas. Great for rapid prototyping and offline demos.
            </span>
          </div>
        )}
      </div>

      {/* HeyVoila API Credentials Box */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              HeyVoila API Credentials (<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">app.heyvoila.io</code>)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Used for Presets (`getServices`), Pickup Locations (`getLocations`), and Carrier Lists</p>
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
              placeholder="e.g. ross.jermy@moovparcel.co.uk"
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
              placeholder="e.g. YTC / MoovParcel"
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
              placeholder="Moov Parcel"
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
            <span className="text-gray-500">Test and verify your credentials with HeyVoila servers</span>
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
