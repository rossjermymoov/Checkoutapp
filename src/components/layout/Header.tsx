import React from 'react';
import { ShoppingBag, Sliders, ShieldCheck, Zap, Server, Package } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';

interface HeaderProps {
  activeTab: 'checkout' | 'settings';
  setActiveTab: (tab: 'checkout' | 'settings') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const settings = SettingsStore.getInstance();
  const [useLiveApi, setUseLiveApi] = React.useState(settings.credentials.useLiveApi);

  React.useEffect(() => {
    return settings.subscribe(() => {
      setUseLiveApi(settings.credentials.useLiveApi);
    });
  }, [settings]);

  const handleToggleMode = () => {
    settings.updateCredentials({ useLiveApi: !useLiveApi });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('checkout')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-bold text-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-gray-900">Checkout Demo</span>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">Intelligent Carrier & Drop Shop Checkout</p>
            </div>
          </div>

          {/* Mode Switch & Tab Navigation */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live API / Sandbox Toggle */}
            <button
              onClick={handleToggleMode}
              title={useLiveApi ? "Switch to Mock / Sandbox Mode" : "Switch to Live Voila & Billing APIs"}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                useLiveApi
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Server className={`w-3.5 h-3.5 ${useLiveApi ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
              <span className="hidden sm:inline">{useLiveApi ? 'Live API Mode' : 'Sandbox / Mock Mode'}</span>
              <span className="sm:hidden">{useLiveApi ? 'Live' : 'Mock'}</span>
            </button>

            {/* View Switcher Tabs */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200">
              <button
                onClick={() => setActiveTab('checkout')}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'checkout'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-sky-600" />
                <span>Checkout</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Carrier Settings</span>
                {settings.logs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
