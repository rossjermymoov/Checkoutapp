import React from 'react';
import { MapPin, Navigation, Sliders, CheckCircle2 } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { CourierLogo } from '../common/CourierLogo';

export const DropShopSettings: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const dropShop = settings.dropShop;
  const enabledCouriers = settings.couriers.filter((c) => c.enabled);

  const handleUpdate = (field: string, value: any) => {
    settings.updateDropShop({ [field]: value });
  };

  const toggleNetwork = (courierKey: string) => {
    const exists = dropShop.enabledCouriers.includes(courierKey);
    const updated = exists
      ? dropShop.enabledCouriers.filter((c) => c !== courierKey)
      : [...dropShop.enabledCouriers, courierKey];
    settings.updateDropShop({ enabledCouriers: updated });
  };

  const availableNetworks = enabledCouriers.map((c) => ({
    key: c.key,
    name: c.name,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-600" />
            Drop Shop & PUDO (Pick Up Drop Off) Configuration
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configure pickup point search parameters and carrier drop networks
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={dropShop.enabled}
            onChange={(e) => handleUpdate('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          <span className="ml-2 text-xs font-semibold text-gray-700">
            {dropShop.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {dropShop.enabled && (
        <div className="space-y-6 pt-2">
          {/* Radius & Limit Controls */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-700">
                <span>Max Search Radius:</span>
                <span className="text-sky-600 font-bold">{dropShop.maxRadiusMiles} miles</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={dropShop.maxRadiusMiles}
                onChange={(e) => handleUpdate('maxRadiusMiles', parseInt(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>1 mi (Walking)</span>
                <span>10 mi (Local)</span>
                <span>25 mi (Regional)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-700">
                <span>Max Locations to Display:</span>
                <span className="text-sky-600 font-bold">{dropShop.maxLocations} stores</span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                value={dropShop.maxLocations}
                onChange={(e) => handleUpdate('maxLocations', parseInt(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>3 stores</span>
                <span>10 stores</span>
                <span>20 stores</span>
              </div>
            </div>
          </div>

          {/* Enabled Networks */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              Enabled Pickup Networks
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {availableNetworks.map((net) => {
                const isChecked = dropShop.enabledCouriers.includes(net.key);
                return (
                  <div
                    key={net.key}
                    onClick={() => toggleNetwork(net.key)}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                        : 'border-gray-200 bg-gray-50/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <CourierLogo courier={net.key} size={28} showName />
                      <span className="text-[10px] text-gray-500">Pickup / access points</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
