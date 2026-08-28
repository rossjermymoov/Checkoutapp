import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { CheckoutPage } from './pages/CheckoutPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [activeTab, setActiveTab] = useState<'checkout' | 'settings'>('checkout');

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f6f7]">
      {/* Top Header Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'checkout' ? (
          <CheckoutPage onOpenSettings={() => setActiveTab('settings')} />
        ) : (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}

export default App;
