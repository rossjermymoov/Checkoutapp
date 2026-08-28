import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { CheckoutPage } from './pages/CheckoutPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminGate } from './components/admin/AdminGate';
import { SettingsStore } from './store/settingsStore';
import { CheckoutStore } from './store/checkoutStore';
import { currentTenantSlug, fetchTenant, TenantBrand } from './services/tenant';

export function App() {
  const [activeTab, setActiveTab] = useState<'checkout' | 'settings'>('checkout');
  const [brand, setBrand] = useState<TenantBrand | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(!!currentTenantSlug());
  const [notFound, setNotFound] = useState(false);

  // A /c/<slug> URL is a customer link: that customer's configuration, their
  // name in the header, and no route to the carrier settings.
  const isCustomerView = !!currentTenantSlug();

  useEffect(() => {
    const slug = currentTenantSlug();
    if (!slug) return;

    let cancelled = false;
    (async () => {
      const res = await fetchTenant(slug);
      if (cancelled) return;
      if (res.found && res.brand) {
        setBrand(res.brand);
        SettingsStore.getInstance().applyTenantSettings(slug, res.settings);
        CheckoutStore.getInstance().calculateRates();
      } else {
        setNotFound(true);
      }
      setLoadingTenant(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f7] px-4">
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-base font-semibold text-gray-900">This link is not available</p>
          <p className="text-xs text-gray-500">
            It may have been revoked, or the address may be mistyped. Ask whoever sent it for a current link.
          </p>
        </div>
      </div>
    );
  }

  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f7]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f6f7]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        brandName={brand ? `${brand.name} Demo` : 'Checkout Demo'}
        tagline={brand?.tagline}
        showSettings={!isCustomerView}
      />

      <main className="flex-1">
        {activeTab === 'checkout' || isCustomerView ? (
          <CheckoutPage onOpenSettings={isCustomerView ? undefined : () => setActiveTab('settings')} />
        ) : (
          <AdminGate>
            <SettingsPage />
          </AdminGate>
        )}
      </main>
    </div>
  );
}

export default App;
