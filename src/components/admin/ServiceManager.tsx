import React, { useState } from 'react';
import { PackageCheck, RefreshCw, Check, Plus, Trash2, Sparkles, Filter, RotateCcw, AlertTriangle } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { getCourierPresets } from '../../services/api';
import { ConfiguredService } from '../../types/settings';

export const ServiceManager: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [selectedCourierToSync, setSelectedCourierToSync] = useState('DPD');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>('all');

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const couriers = settings.couriers;
  const enabledCouriers = couriers.filter((c) => c.enabled);
  const services = settings.services;

  const handleToggleCourier = (key: string) => {
    settings.toggleCourier(key);
    // If we just enabled/disabled a courier, ensure selectedCourierToSync is valid
    const stillActive = settings.couriers.filter(c => c.enabled);
    if (stillActive.length > 0 && !stillActive.some(c => c.key === selectedCourierToSync)) {
      setSelectedCourierToSync(stillActive[0].key);
    }
  };

  const handleToggleService = (id: string) => {
    settings.toggleService(id);
  };

  const handleUpdateService = (id: string, updates: Partial<ConfiguredService>) => {
    settings.updateService(id, updates);
  };

  const handleDeleteService = (id: string) => {
    settings.deleteService(id);
  };

  const handleResetServices = () => {
    if (window.confirm('Reset all delivery services to the clean default DPD, UPS, and Yodel presets?')) {
      settings.resetServicesToDefaults();
      setSyncMessage({
        text: 'Services reset to default active courier presets (DPD, UPS, Yodel).',
        type: 'info'
      });
    }
  };

  const handleSyncPresets = async (courierToFetch?: string) => {
    const courier = courierToFetch || selectedCourierToSync;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await getCourierPresets(courier, settings.credentials);
      if (res.presets && res.presets.length > 0) {
        const newServices: ConfiguredService[] = res.presets.map((p, idx) => ({
          dc_service_id: p.dc_service_id || `${courier}-${p.id}`,
          courier: p.courier || courier,
          originalName: p.name,
          displayName: p.name,
          leadTime: p.lead_time || '1-2 Working Days',
          enabled: true,
          priority: services.length + idx + 1,
          isDropShop: p.name.toLowerCase().includes('pickup') || p.name.toLowerCase().includes('parcelshop') || p.name.toLowerCase().includes('locker') || p.name.toLowerCase().includes('access point'),
          badgeText: p.name.toLowerCase().includes('next day') ? 'Fastest' : undefined,
          priceOverride: null,
        }));

        settings.addServices(newServices);
        setSyncMessage({
          text: `Successfully synced ${res.presets.length} presets for ${courier} (${res.fromLive ? 'Live HeyVoila' : 'Preset Catalog'}).`,
          type: 'success'
        });
      } else {
        setSyncMessage({
          text: `No presets returned for ${courier}. ${res.error || ''}`,
          type: 'warning'
        });
      }
    } catch (err: any) {
      setSyncMessage({
        text: `Error syncing presets for ${courier}: ${err.message}`,
        type: 'warning'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAllActive = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    let totalSynced = 0;
    const errors: string[] = [];

    for (const courier of enabledCouriers) {
      try {
        const res = await getCourierPresets(courier.key, settings.credentials);
        if (res.presets && res.presets.length > 0) {
          const newServices: ConfiguredService[] = res.presets.map((p, idx) => ({
            dc_service_id: p.dc_service_id || `${courier.key}-${p.id}`,
            courier: p.courier || courier.key,
            originalName: p.name,
            displayName: p.name,
            leadTime: p.lead_time || '1-2 Working Days',
            enabled: true,
            priority: services.length + idx + 1,
            isDropShop: p.name.toLowerCase().includes('pickup') || p.name.toLowerCase().includes('parcelshop') || p.name.toLowerCase().includes('access point'),
            badgeText: p.name.toLowerCase().includes('next day') ? 'Fastest' : undefined,
            priceOverride: null,
          }));
          settings.addServices(newServices);
          totalSynced += res.presets.length;
        }
      } catch (err: any) {
        errors.push(`${courier.key}: ${err.message}`);
      }
    }

    setIsSyncing(false);
    if (errors.length > 0) {
      setSyncMessage({
        text: `Synced ${totalSynced} presets across active couriers. Warnings: ${errors.join(', ')}`,
        type: 'warning'
      });
    } else {
      setSyncMessage({
        text: `Successfully synced all presets for active couriers (${enabledCouriers.map(c => c.name).join(', ')}). Total: ${totalSynced} services active.`,
        type: 'success'
      });
    }
  };

  // Filter services by active couriers and search query
  const enabledCourierKeys = new Set(enabledCouriers.map((c) => c.key.toLowerCase()));

  const filteredServices = services.filter((s) => {
    const courierMatch = enabledCourierKeys.has(s.courier.toLowerCase());
    const filterCourierMatch = selectedCourierFilter === 'all' || s.courier.toLowerCase() === selectedCourierFilter.toLowerCase();
    const searchMatch =
      s.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.originalName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.dc_service_id.toLowerCase().includes(searchFilter.toLowerCase());

    return courierMatch && filterCourierMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Courier Selection Row */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-sky-600" />
              Active Couriers & Integrations
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select which courier accounts to enable (DPD, UPS, Yodel). Only enabled couriers will have presets fetched and shown at checkout.
            </p>
          </div>

          <div className="text-xs font-semibold px-3 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200 self-start sm:self-auto">
            {enabledCouriers.length} Active Accounts
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {couriers.map((courier) => {
            const isMainCourier = ['DPD', 'UPS', 'Yodel'].includes(courier.key);
            return (
              <div
                key={courier.key}
                onClick={() => handleToggleCourier(courier.key)}
                className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all ${
                  courier.enabled
                    ? 'border-sky-600 bg-sky-50/50 shadow-xs ring-1 ring-sky-500/30'
                    : 'border-gray-200 bg-gray-50/40 opacity-60 hover:opacity-100 hover:border-gray-300'
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
                {isMainCourier && (
                  <span className="text-[9px] text-sky-700 font-medium block">Integrated</span>
                )}
                <span className={`inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full ${
                  courier.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {courier.enabled ? '● Active' : '○ Off'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Presets from Voila API */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              Sync Courier Presets (`GET /api/couriers/v1/&#123;&#123;Courier&#125;&#125;/presets`)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Pull genuine services and routing codes directly from HeyVoila for your active couriers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCourierToSync}
              onChange={(e) => setSelectedCourierToSync(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {enabledCouriers.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleSyncPresets()}
              disabled={isSyncing || enabledCouriers.length === 0}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Fetch {selectedCourierToSync}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAllActive}
              disabled={isSyncing || enabledCouriers.length === 0}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Sync All Active ({enabledCouriers.length})</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : syncMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}>
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{syncMessage.text}</span>
          </div>
        )}
      </div>

      {/* Configured Services Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Active Checkout Delivery Services ({filteredServices.filter((s) => s.enabled).length} Enabled)
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure names, transit badges, and pricing overrides shown at checkout
            </p>
          </div>

          {/* Controls: Reset, Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetServices}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
              title="Reset to default clean presets for DPD, UPS, and Yodel"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Services</span>
            </button>

            <select
              value={selectedCourierFilter}
              onChange={(e) => setSelectedCourierFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
            >
              <option value="all">All Active Couriers</option>
              {enabledCouriers.map((c) => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))}
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

        {filteredServices.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-800">No Services Configured for Active Couriers</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Click &quot;Fetch Presets&quot; above or click &quot;Reset Services&quot; to populate services for DPD, UPS, and Yodel.
            </p>
            <button
              type="button"
              onClick={handleResetServices}
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
                  <th className="px-4 py-3 w-10">Show</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Service Code (Preset ID)</th>
                  <th className="px-4 py-3">Customer Display Name</th>
                  <th className="px-4 py-3">Transit Time Badge</th>
                  <th className="px-4 py-3">Badge Tag</th>
                  <th className="px-4 py-3">Price (£)</th>
                  <th className="px-3 py-3 w-10 text-center">Action</th>
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
                      <span className={`px-2 py-0.5 rounded-md border text-xs font-bold ${
                        service.courier === 'DPD'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : service.courier === 'UPS'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : service.courier === 'Yodel'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-gray-100 border-gray-200 text-gray-800'
                      }`}>
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
