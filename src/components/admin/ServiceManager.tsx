import React, { useState } from 'react';
import {
  PackageCheck,
  RefreshCw,
  Check,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Clipboard,
  Shield,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
} from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { getMoovParcelPresets } from '../../services/api';
import { ConfiguredService } from '../../types/settings';
import { VoilaPreset } from '../../types/api';

interface ImportCandidate {
  selected: boolean;
  preset: VoilaPreset;
  assignedCourier: 'DPD' | 'UPS' | 'Yodel';
  displayName: string;
  leadTime: string;
  isDropShop: boolean;
  badgeText?: string;
  priceOverride?: number | null;
}

export const ServiceManager: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);

  // Auth credentials local state (synced with settingsStore)
  const [apiUser, setApiUser] = useState(settings.credentials.voilaApiUser || '');
  const [apiToken, setApiToken] = useState(settings.credentials.voilaApiToken || '');

  // Fetching & Candidates state
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Filters & search for active table
  const [searchFilter, setSearchFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [savedNotification, setSavedNotification] = useState(false);

  React.useEffect(() => {
    return settings.subscribe(() => {
      setTick((t) => t + 1);
      setApiUser(settings.credentials.voilaApiUser || '');
      setApiToken(settings.credentials.voilaApiToken || '');
    });
  }, [settings]);

  const activeServices = settings.services;
  const couriers = settings.couriers;

  // Helper to intelligently detect courier from preset name / ID
  const detectCourier = (name: string, code: string): 'DPD' | 'UPS' | 'Yodel' => {
    const combined = `${name} ${code}`.toUpperCase();
    if (combined.includes('DPD')) return 'DPD';
    if (combined.includes('UPS')) return 'UPS';
    if (combined.includes('YODEL') || combined.includes('YOD')) return 'Yodel';
    return 'DPD'; // Default fallback
  };

  // Diagnostic state for last live call
  const [lastCallDetails, setLastCallDetails] = useState<{
    targetUrl: string;
    method: string;
    status?: number;
    headersSent?: Record<string, string>;
    rawResponse?: any;
    timestamp?: string;
  } | null>(null);

  // Convert raw Voila presets into candidate objects
  const processPresetsIntoCandidates = (presets: VoilaPreset[]) => {
    const mapped: ImportCandidate[] = presets.map((p) => {
      const detected = detectCourier(p.name || '', p.dc_service_id || '');
      const lower = (p.name || '').toLowerCase();
      const isPickup =
        lower.includes('pickup') ||
        lower.includes('parcelshop') ||
        lower.includes('access point') ||
        lower.includes('drop') ||
        lower.includes('locker') ||
        lower.includes('c2c');

      const isFast = lower.includes('next day') || lower.includes('express');

      return {
        selected: true, // Default to checked
        preset: p,
        assignedCourier: detected,
        displayName: p.name || p.dc_service_id || 'Delivery Service',
        leadTime: p.lead_time || (isFast ? 'Next working day' : '1-2 working days'),
        isDropShop: isPickup,
        badgeText: isFast ? 'Fastest' : undefined,
        priceOverride: null,
      };
    });

    setCandidates(mapped);
    setFetchSuccessMessage(`Retrieved ${presets.length} services from MoovParcel endpoint. Select the ones you care about below and assign them to DPD, UPS, or Yodel.`);
  };

  // Live GET call to https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets
  const handleFetchMoovParcelPresets = async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchSuccessMessage(null);

    const fullUrl = `https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets`;
    const headersSent = {
      'api-user': apiUser.trim(),
      'api-token': apiToken.trim() ? `${apiToken.trim().substring(0, 4)}...${apiToken.trim().slice(-4)}` : '(empty)',
      'api-key': apiToken.trim() ? `${apiToken.trim().substring(0, 4)}...${apiToken.trim().slice(-4)}` : '(empty)',
    };

    // Save auth headers if user changed them
    settings.updateCredentials({
      voilaApiUser: apiUser.trim(),
      voilaApiToken: apiToken.trim(),
    });

    try {
      const res = await getMoovParcelPresets({
        ...settings.credentials,
        voilaApiUser: apiUser.trim(),
        voilaApiToken: apiToken.trim(),
      });

      setLastCallDetails({
        targetUrl: fullUrl,
        method: 'GET',
        headersSent,
        rawResponse: res.presets.length > 0 ? res.presets : (res.error || 'Empty response'),
        timestamp: new Date().toLocaleTimeString(),
      });

      if (res.fromLive && res.presets && res.presets.length > 0) {
        processPresetsIntoCandidates(res.presets);
      } else if (res.presets && res.presets.length > 0) {
        processPresetsIntoCandidates(res.presets);
        setFetchSuccessMessage(`Loaded ${res.presets.length} presets (${res.error || 'Running in sandbox mode'}).`);
      } else {
        setFetchError(res.error || 'No presets returned from https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets. Check your credentials or paste raw JSON directly.');
      }
    } catch (err: any) {
      setLastCallDetails({
        targetUrl: fullUrl,
        method: 'GET',
        headersSent,
        rawResponse: { error: err.message },
        timestamp: new Date().toLocaleTimeString(),
      });
      setFetchError(err.message || 'Error fetching MoovParcel presets');
    } finally {
      setIsFetching(false);
    }
  };

  // Parse pasted JSON payload
  const handleApplyPastedJson = () => {
    setPasteError(null);
    try {
      let parsed = JSON.parse(pastedJson.trim());
      let list: VoilaPreset[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed.presets && Array.isArray(parsed.presets)) {
        list = parsed.presets;
      } else if (parsed.user_presets && Array.isArray(parsed.user_presets)) {
        list = parsed.user_presets;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        list = parsed.data;
      } else if (typeof parsed === 'object') {
        list = [parsed as VoilaPreset];
      }

      if (list.length === 0) {
        setPasteError('JSON does not contain an array of presets/services.');
        return;
      }

      processPresetsIntoCandidates(list);
      setShowPasteModal(false);
      setPastedJson('');
    } catch (e: any) {
      setPasteError(`Invalid JSON format: ${e.message}`);
    }
  };

  // Update candidate fields
  const handleUpdateCandidate = (index: number, updates: Partial<ImportCandidate>) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSelectAllCandidates = (selected: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected })));
  };

  // Save selected candidates into checkout services (forget all unselected ones)
  const handleApplySelectedServices = () => {
    const selected = candidates.filter((c) => c.selected);
    if (selected.length === 0) {
      alert('Please select at least one service to keep.');
      return;
    }

    const newServices: ConfiguredService[] = selected.map((c, idx) => ({
      dc_service_id: c.preset.dc_service_id || `${c.assignedCourier}-${c.preset.id || idx + 1}`,
      courier: c.assignedCourier,
      originalName: c.preset.name || c.displayName,
      displayName: c.displayName,
      leadTime: c.leadTime,
      enabled: true,
      priority: idx + 1,
      isDropShop: c.isDropShop,
      badgeText: c.badgeText || undefined,
      priceOverride: c.priceOverride ?? null,
    }));

    // Replace all active services with ONLY the chosen ones
    settings.setServices(newServices);
    setCandidates([]);
    setFetchSuccessMessage(null);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  // Active table handlers
  const handleToggleService = (id: string) => settings.toggleService(id);
  const handleUpdateService = (id: string, updates: Partial<ConfiguredService>) => settings.updateService(id, updates);
  const handleDeleteService = (id: string) => settings.deleteService(id);

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all delivery services to the clean default DPD, UPS, and Yodel services?')) {
      settings.resetServicesToDefaults();
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 3000);
    }
  };

  // Filtered active services
  const filteredActiveServices = activeServices.filter((s) => {
    const courierMatch = courierFilter === 'all' || s.courier.toLowerCase() === courierFilter.toLowerCase();
    const searchMatch =
      s.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.originalName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.dc_service_id.toLowerCase().includes(searchFilter.toLowerCase());
    return courierMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-100 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              MoovParcel Presets & Courier Mapping Studio
            </h3>
            <p className="text-xs text-gray-600 max-w-2xl">
              Fetch all preset services directly from <code className="bg-white/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px] border border-indigo-100">api/couriers/v1/MoovParcel/presets</code>, select the services you care about, and assign them to <strong>DPD</strong>, <strong>UPS</strong>, or <strong>Yodel</strong>. Everything else is ignored.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Clipboard className="w-3.5 h-3.5 text-gray-600" />
              <span>Paste Raw JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fetch Presets Control Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span>Fetch Presets from HeyVoila MoovParcel Endpoint</span>
            </h4>
            <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
              <span>Full Destination URL:</span>
              <code className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-mono font-semibold">
                GET https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets
              </code>
            </p>
          </div>
        </div>

        {/* Auth Headers inputs */}
        <div className="grid sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700 font-mono">api-user</code>
            </label>
            <input
              type="text"
              value={apiUser}
              onChange={(e) => setApiUser(e.target.value)}
              placeholder="e.g. Moov Parcel Master or email"
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Header: <code className="text-sky-700 font-mono">api-token / api-key</code>
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Enter Voila API token / key"
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="button"
              onClick={handleFetchMoovParcelPresets}
              disabled={isFetching}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Contacting Voila...' : '⚡ Fetch MoovParcel Presets'}</span>
            </button>
          </div>
        </div>

        {/* Live Call Diagnostic Panel */}
        {lastCallDetails && (
          <div className="p-3 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono space-y-1.5 border border-gray-800">
            <div className="flex items-center justify-between text-gray-400 text-[11px] pb-1 border-b border-gray-800">
              <span className="text-indigo-400 font-bold">📡 Live API Call Inspector ({lastCallDetails.timestamp})</span>
              <span>Proxy &rarr; Upstream</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Destination:</span>{' '}
              <span className="text-yellow-300">{lastCallDetails.method} {lastCallDetails.targetUrl}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Headers Sent:</span>{' '}
              <span className="text-gray-300">api-user: {lastCallDetails.headersSent?.['api-user'] || '(none)'} | api-token: {lastCallDetails.headersSent?.['api-token'] || '(none)'}</span>
            </div>
            <div className="pt-1">
              <span className="text-emerald-400 font-bold">Response:</span>{' '}
              <span className={fetchError ? 'text-rose-400' : 'text-emerald-300'}>
                {typeof lastCallDetails.rawResponse === 'object' ? JSON.stringify(lastCallDetails.rawResponse).substring(0, 200) : String(lastCallDetails.rawResponse)}
              </span>
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {fetchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Voila API Message:</p>
              <p className="font-mono text-[11px]">{fetchError}</p>
              <p className="text-gray-600 text-[11px] mt-1">
                Tip: If you already have the response or list from Postman / Voila, you can also click the <strong>"Paste Raw JSON"</strong> button above to paste it instantly.
              </p>
            </div>
          </div>
        )}

        {fetchSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{fetchSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Paste Raw JSON Modal / Dropdown */}
      {showPasteModal && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 space-y-4 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-indigo-600" />
              Paste MoovParcel Presets JSON Payload
            </h4>
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Paste the JSON array of services or response body from <code className="font-mono text-gray-700">api/couriers/v1/MoovParcel/presets</code>:
          </p>

          <textarea
            rows={7}
            value={pastedJson}
            onChange={(e) => setPastedJson(e.target.value)}
            placeholder={`[\n  {\n    "id": 1,\n    "dc_service_id": "DPD12-DROP",\n    "name": "DPD Drop Off Next Day",\n    "courier": "DPD"\n  },\n  {\n    "id": 2,\n    "dc_service_id": "YODC2C",\n    "name": "Yodel C2C",\n    "courier": "Yodel"\n  }\n]`}
            className="w-full p-3 bg-gray-950 text-emerald-300 font-mono text-xs rounded-xl border border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {pasteError && (
            <p className="text-xs text-rose-600 font-semibold">{pasteError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyPastedJson}
              disabled={!pastedJson.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import & Map Services</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Candidate Review & Courier Assignment Studio */}
      {candidates.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500/80 p-6 space-y-5 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <h4 className="text-base font-bold text-gray-900">
                  Step 2: Choose & Assign Services ({candidates.filter((c) => c.selected).length} of {candidates.length} Selected)
                </h4>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tick the services you care about, select which courier (<strong>DPD</strong>, <strong>UPS</strong>, or <strong>Yodel</strong>) they belong to, and click <strong>Apply & Save</strong>. All unselected services will be excluded.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectAllCandidates(true)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllCandidates(false)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-indigo-50/70 text-indigo-950 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">Use?</th>
                  <th className="px-4 py-3">Service ID (Preset Code)</th>
                  <th className="px-4 py-3">Assign Courier</th>
                  <th className="px-4 py-3">Checkout Display Name</th>
                  <th className="px-4 py-3">Transit Time</th>
                  <th className="px-4 py-3">Pickup / Locker?</th>
                  <th className="px-4 py-3">Price (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {candidates.map((cand, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${cand.selected ? 'bg-white hover:bg-indigo-50/30' : 'bg-gray-50/60 opacity-40'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        onChange={(e) => handleUpdateCandidate(idx, { selected: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                      />
                    </td>

                    {/* Service ID / Code */}
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {cand.preset.dc_service_id || `PRESET-${cand.preset.id || idx + 1}`}
                      {cand.preset.name && cand.preset.name !== cand.displayName && (
                        <span className="block text-[10px] font-normal text-gray-500 truncate max-w-xs">
                          {cand.preset.name}
                        </span>
                      )}
                    </td>

                    {/* Courier Selector Dropdown */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={cand.assignedCourier}
                        onChange={(e) => handleUpdateCandidate(idx, { assignedCourier: e.target.value as any })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          cand.assignedCourier === 'DPD'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : cand.assignedCourier === 'UPS'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <option value="DPD">🔴 DPD</option>
                        <option value="UPS">🟤 UPS</option>
                        <option value="Yodel">🟢 Yodel</option>
                      </select>
                    </td>

                    {/* Display Name */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={cand.displayName}
                        onChange={(e) => handleUpdateCandidate(idx, { displayName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Transit Time */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={cand.leadTime}
                        onChange={(e) => handleUpdateCandidate(idx, { leadTime: e.target.value })}
                        className="w-32 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Drop Shop / Pickup */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cand.isDropShop}
                          onChange={(e) => handleUpdateCandidate(idx, { isDropShop: e.target.checked })}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-700">{cand.isDropShop ? 'Pickup Point' : 'Doorstep'}</span>
                      </label>
                    </td>

                    {/* Price Override */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Live API"
                        value={cand.priceOverride !== null && cand.priceOverride !== undefined ? cand.priceOverride : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          handleUpdateCandidate(idx, { priceOverride: val });
                        }}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Ready to replace active checkout services with the <strong>{candidates.filter((c) => c.selected).length} selected service(s)</strong>.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCandidates([])}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleApplySelectedServices}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Apply & Save Selected Services ({candidates.filter((c) => c.selected).length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Checkout Delivery Services Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Active Checkout Services ({filteredActiveServices.filter((s) => s.enabled).length} Enabled in Customer View)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              These are the only services presented to customers on the checkout page
            </p>
          </div>

          {/* Controls: Reset, Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
              title="Reset to default clean presets for DPD, UPS, and Yodel"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Defaults</span>
            </button>

            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
            >
              <option value="all">All Couriers</option>
              <option value="DPD">🔴 DPD</option>
              <option value="UPS">🟤 UPS</option>
              <option value="Yodel">🟢 Yodel</option>
            </select>

            <input
              type="text"
              placeholder="Search services..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 w-36 sm:w-44"
            />
          </div>
        </div>

        {savedNotification && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-pulse">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Active checkout services updated and saved to storage!</span>
          </div>
        )}

        {filteredActiveServices.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-800">No Active Services Configured</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Click &quot;Fetch MoovParcel Presets&quot; above to import and assign services, or click &quot;Reset Defaults&quot;.
            </p>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Default Services</span>
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">Live</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Routing Code</th>
                  <th className="px-4 py-3">Customer Display Name</th>
                  <th className="px-4 py-3">Transit Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price (£)</th>
                  <th className="px-3 py-3 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredActiveServices.map((service) => (
                  <tr key={service.dc_service_id} className={`hover:bg-gray-50 ${service.enabled ? '' : 'opacity-40'}`}>
                    {/* Enabled Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={() => handleToggleService(service.dc_service_id)}
                        className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 border-gray-300 cursor-pointer"
                      />
                    </td>

                    {/* Courier Dropdown / Badge */}
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      <select
                        value={service.courier}
                        onChange={(e) => handleUpdateService(service.dc_service_id, { courier: e.target.value })}
                        className={`px-2 py-1 rounded-md border text-xs font-bold ${
                          service.courier === 'DPD'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : service.courier === 'UPS'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : service.courier === 'Yodel'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-gray-100 border-gray-200 text-gray-800'
                        }`}
                      >
                        <option value="DPD">DPD</option>
                        <option value="UPS">UPS</option>
                        <option value="Yodel">Yodel</option>
                      </select>
                    </td>

                    {/* Routing Preset Code */}
                    <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                      {service.dc_service_id}
                    </td>

                    {/* Display Name Input */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={service.displayName}
                        onChange={(e) => handleUpdateService(service.dc_service_id, { displayName: e.target.value })}
                        className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </td>

                    {/* Lead Time Input */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={service.leadTime}
                        onChange={(e) => handleUpdateService(service.dc_service_id, { leadTime: e.target.value })}
                        className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleUpdateService(service.dc_service_id, { isDropShop: !service.isDropShop })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          service.isDropShop
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-gray-100 border-gray-200 text-gray-700'
                        }`}
                      >
                        {service.isDropShop ? 'Pickup Point' : 'Doorstep'}
                      </button>
                    </td>

                    {/* Price Override */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Live API"
                        value={service.priceOverride !== null && service.priceOverride !== undefined ? service.priceOverride : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          handleUpdateService(service.dc_service_id, { priceOverride: val });
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.dc_service_id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
