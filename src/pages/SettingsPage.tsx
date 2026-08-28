import React, { useState } from 'react';
import { Sliders, Key, PackageCheck, DollarSign, MapPin, Terminal, RotateCcw, Check, Sparkles, Server } from 'lucide-react';
import { SettingsStore } from '../store/settingsStore';
import { CredentialsSettings } from '../components/admin/CredentialsSettings';
import { ServiceManager } from '../components/admin/ServiceManager';
import { PricingRules } from '../components/admin/PricingRules';
import { DropShopSettings } from '../components/admin/DropShopSettings';
import { ApiInspector } from '../components/admin/ApiInspector';
import { CourierConfig, ConfiguredService } from '../types/settings';

export const SettingsPage: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'services' | 'pricing' | 'dropshop' | 'inspector'>('credentials');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const activeCouriersCount = settings.couriers.filter((c: CourierConfig) => c.enabled).length;
  const activeServicesCount = settings.services.filter((s: ConfiguredService) => s.enabled).length;

  const handleReset = () => {
    settings.resetToDefaults();
    setShowResetConfirm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Settings Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 border border-sky-400/30 rounded-full text-xs font-semibold text-sky-300">
              <Sliders className="w-3.5 h-3.5" />
              <span>Merchant Carrier Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Carrier & Checkout Settings
            </h1>
            <p className="text-sm text-slate-300">
              Manage your HeyVoila API credentials, BillingAPI quote parameters, active courier routes, pricing markups, and Drop Shop networks.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs">
            <div className="px-3 py-1.5 bg-black/20 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase">Active Couriers</span>
              <span className="text-base font-bold text-white">{activeCouriersCount} Couriers</span>
            </div>
            <div className="px-3 py-1.5 bg-black/20 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase">Enabled Services</span>
              <span className="text-base font-bold text-white">{activeServicesCount} Routes</span>
            </div>
            <div className="px-3 py-1.5 bg-black/20 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase">Drop Shop</span>
              <span className="text-base font-bold text-emerald-400">{settings.dropShop.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveSubTab('credentials')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeSubTab === 'credentials'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials & Endpoints</span>
          </button>

          <button
            onClick={() => setActiveSubTab('services')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeSubTab === 'services'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Couriers & Services (`presets`)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pricing')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeSubTab === 'pricing'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing Rules & Markups</span>
          </button>

          <button
            onClick={() => setActiveSubTab('dropshop')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeSubTab === 'dropshop'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Drop Shop / PUDO</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inspector')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeSubTab === 'inspector'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live API Inspector</span>
            {settings.logs.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                {settings.logs.length}
              </span>
            )}
          </button>
        </div>

        {/* Reset Settings to Defaults Button */}
        <div>
          {showResetConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-rose-600 font-semibold">Reset all settings?</span>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 transition-colors border border-gray-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Panels */}
      <div className="pt-2">
        {activeSubTab === 'credentials' && <CredentialsSettings />}
        {activeSubTab === 'services' && <ServiceManager />}
        {activeSubTab === 'pricing' && <PricingRules />}
        {activeSubTab === 'dropshop' && <DropShopSettings />}
        {activeSubTab === 'inspector' && <ApiInspector />}
      </div>
    </div>
  );
};
