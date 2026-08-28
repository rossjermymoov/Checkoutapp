import React, { useState } from 'react';
import { PackageCheck, RefreshCw, Check, Plus, Edit2, Trash2, Sliders, ExternalLink, Sparkles, Filter } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { getCourierPresets } from '../../services/api';
import { ConfiguredService } from '../../types/settings';

export const ServiceManager: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [selectedCourierToSync, setSelectedCourierToSync] = useState('DPD');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>('all');

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const couriers = settings.couriers;
  const services = settings.services;

  const handleToggleCourier = (key: string) => {
    settings.toggleCourier(key);
  };

  const handleToggleService = (id: string) => {
    settings.toggleService(id);
  };

  const handleUpdateService = (id: string, updates: Partial<ConfiguredService>) => {
    settings.updateService(id, updates);
  };

  const handleSyncPresets = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await getCourierPresets(selectedCourierToSync, settings.credentials);
      if (res.presets && res.presets.length > 0) {
        const newServices: ConfiguredService[] = res.presets.map((p, idx) => ({
          dc_service_id: p.dc_service_id || `${selectedCourierToSync}-${p.id}`,
          courier: p.courier || selectedCourierToSync,
          originalName: p.name,
          displayName: p.name,
          leadTime: p.lead_time || '1-2 Working Days',
          enabled: true,
          priority: services.length + idx + 1,
          isDropShop: p.name.toLowerCase().includes('pickup') || p.name.toLowerCase().includes('parcelshop') || p.name.toLowerCase().includes('locker')
        }));

        settings.addServices(newServices);
        setSyncMessage(`Successfully fetched ${res.presets.length} presets for ${selectedCourierToSync}!`);
      } else {
        setSyncMessage(`No presets returned for ${selectedCourierToSync}.`);
      }
    } catch (err: any) {
      setSyncMessage(`Error syncing presets: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          s.originalName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          s.dc_service_id.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCourier = selectedCourierFilter === 'all' || s.courier.toLowerCase() === selectedCourierFilter.toLowerCase();
    return matchesSearch && matchesCourier;
  });

  return (
    <div className="space-y-6">
      {/* Courier Selection Row */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-sky-600" />
            Courier Account Selection & Endpoints
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Enable or disable specific couriers you have API credentials for
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {couriers.map((courier) => (
            <div
              key={courier.key}
              onClick={() => handleToggleCourier(courier.key)}
              className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                courier.enabled
                  ? 'border-sky-600 bg-sky-50/50 shadow-xs ring-1 ring-sky-500/30'
                  : 'border-gray-200 bg-gray-50/50 opacity-60 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1 shadow-xs mb-2">
                <img
                  src={courier.logo}
                  alt={courier.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-xs font-bold text-gray-900 truncate">{courier.name}</p>
              <span className={`inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                courier.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
              }`}>
                {courier.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Presets from Voila API */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              Sync Presets from Voila API (`GET /api/couriers/v1/&#123;&#123;Courier&#125;&#125;/presets`)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Query all available services and routing codes directly from HeyVoila for the selected courier
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedCourierToSync}
              onChange={(e) => setSelectedCourierToSync(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {couriers.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSyncPresets}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Fetching...' : 'Fetch Presets'}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Configured Services Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Active Checkout Delivery Services ({services.filter((s) => s.enabled).length} Enabled)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Select which services to display to the customer at checkout, edit customer-facing names, and badges
            </p>
          </div>

          {/* Filter / Search Bar */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCourierFilter}
              onChange={(e) => setSelectedCourierFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
            >
              <option value="all">All Couriers</option>
              {couriers.map((c) => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search services..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 w-36 sm:w-48"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10">Show</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Service Code (Preset ID)</th>
                <th className="px-4 py-3">Customer Display Name</th>
                <th className="px-4 py-3">Transit Time Badge</th>
                <th className="px-4 py-3">Badge Tag</th>
                <th className="px-4 py-3">Price (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredServices.map((service) => (
                <tr key={service.dc_service_id} className={`hover:bg-gray-50 ${service.enabled ? '' : 'opacity-50'}`}>
                  {/* Enabled Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={service.enabled}
                      onChange={() => handleToggleService(service.dc_service_id)}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 border-gray-300 cursor-pointer"
                    />
                  </td>

                  {/* Courier Badge */}
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-800">
                      {service.courier}
                    </span>
                  </td>

                  {/* Original Preset Code */}
                  <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                    {service.dc_service_id}
                  </td>

                  {/* Display Name Input */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={service.displayName}
                      onChange={(e) => handleUpdateService(service.dc_service_id, { displayName: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </td>

                  {/* Lead Time Input */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={service.leadTime}
                      onChange={(e) => handleUpdateService(service.dc_service_id, { leadTime: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </td>

                  {/* Badge Text */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="e.g. Fastest"
                      value={service.badgeText || ''}
                      onChange={(e) => handleUpdateService(service.dc_service_id, { badgeText: e.target.value || undefined })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </td>

                  {/* Price Override */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Auto"
                      value={service.priceOverride !== null && service.priceOverride !== undefined ? service.priceOverride : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        handleUpdateService(service.dc_service_id, { priceOverride: val });
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
