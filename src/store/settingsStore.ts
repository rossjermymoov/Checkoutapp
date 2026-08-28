import { ApiCredentials, ConfiguredService, CourierConfig, PricingRules, DropShopSettings } from '../types/settings';
import { ApiLogEntry } from '../types/api';
import { INITIAL_COURIERS } from '../services/mockData';
import { setApiLogListener } from '../services/api';

// v4: the fictional default services (UPS-STANDARD, DPD-NEXT-DAY,
// DPD-PICKUP, UPS-ACCESS-POINT) were removed. Bumping the key stops them
// being resurrected from a browser that still holds the old list.
const STORAGE_KEY = 'checkout_demo_settings_v4';
const PERMANENT_CREDENTIALS_KEY = 'checkout_demo_credentials_permanent';

/**
 * Deliberately empty. Services are chosen by the merchant from the live Voila
 * catalogue (Settings -> Service Catalogue), never invented here.
 *
 * The previous defaults listed six services of which four — UPS-STANDARD,
 * DPD-NEXT-DAY, DPD-PICKUP and UPS-ACCESS-POINT — did not exist in any real
 * account. They could never be quoted or shipped, and made the console look
 * configured when it was not.
 */
const INITIAL_SERVICES: ConfiguredService[] = [];

export const DEFAULT_CREDENTIALS: ApiCredentials = {
  voilaApiUser: '',
  voilaApiToken: '',
  voilaAuthCompany: '',
  billingClientName: 'Moov Parcel',
  billingCustomerDcId: 'Kitloop',
  billingCustomerKey: '',
  billingEndpointUrl: 'https://production.billingapi.co.uk/api/customer-routes/get-quote',
  useLiveApi: true,
};

const DEFAULT_PRICING: PricingRules = {
  markupType: 'none',
  markupValue: 0,
  freeShippingThreshold: 150,
};

const DEFAULT_DROPSHOP: DropShopSettings = {
  enabled: true,
  maxRadiusMiles: 5,
  maxLocations: 8,
  enabledCouriers: ['DPD', 'UPS', 'Yodel'],
};

// Helper to rescue credentials from any previous local storage keys
function loadPersistedCredentials(): ApiCredentials {
  let result = { ...DEFAULT_CREDENTIALS };

  if (typeof window === 'undefined' || !window.localStorage) {
    return result;
  }

  // 1. Try permanent credentials store
  try {
    const permanent = localStorage.getItem(PERMANENT_CREDENTIALS_KEY);
    if (permanent) {
      const parsed = JSON.parse(permanent);
      // Cleanse any fake token artifacts
      if (parsed.voilaApiToken && parsed.voilaApiToken.includes('voila_live_sec')) {
        parsed.voilaApiToken = '';
      }
      result = { ...result, ...parsed };
      return result;
    }
  } catch (e) {}

  // 2. Scan legacy keys
  const legacyKeys = [
    'checkout_demo_settings_v3',
    'checkout_demo_settings_v2',
    'checkout_demo_settings_v1',
    'checkout_demo_settings',
    'moov_checkout_settings'
  ];

  for (const key of legacyKeys) {
    try {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (parsed.credentials && Object.keys(parsed.credentials).length > 0) {
          result = { ...result, ...parsed.credentials };
          // Save to permanent key immediately
          localStorage.setItem(PERMANENT_CREDENTIALS_KEY, JSON.stringify(result));
          return result;
        }
      }
    } catch (e) {}
  }

  return result;
}

export class SettingsStore {
  private static instance: SettingsStore;
  private subscribers = new Set<() => void>();

  public credentials: ApiCredentials;
  public couriers: CourierConfig[];
  public services: ConfiguredService[];
  public pricing: PricingRules;
  public dropShop: DropShopSettings;
  public logs: ApiLogEntry[] = [];

  private constructor() {
    this.credentials = loadPersistedCredentials();
    this.couriers = INITIAL_COURIERS;
    this.services = INITIAL_SERVICES;
    this.pricing = DEFAULT_PRICING;
    this.dropShop = DEFAULT_DROPSHOP;

    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.credentials) {
          this.credentials = { ...this.credentials, ...parsed.credentials };
        }
        this.couriers = parsed.couriers || INITIAL_COURIERS;
        // Cleanse services to remove InPost or other disabled/non-existent couriers
        const loadedServices: ConfiguredService[] = parsed.services || INITIAL_SERVICES;
        this.services = loadedServices.filter((s) => s.courier !== 'InPost');
        this.pricing = { ...DEFAULT_PRICING, ...(parsed.pricing || {}) };
        this.dropShop = { ...DEFAULT_DROPSHOP, ...(parsed.dropShop || {}) };
        // Ensure dropShop enabledCouriers doesn't include InPost
        this.dropShop.enabledCouriers = this.dropShop.enabledCouriers.filter((c) => c !== 'InPost');
      } catch (e) {}
    }

    // Connect log listener
    setApiLogListener((entry) => {
      this.logs = [entry, ...this.logs.slice(0, 49)];
      this.notify(false);
    });

    // Sync with server disk credentials
    this.syncWithServerCredentials();
  }

  private async syncWithServerCredentials() {
    try {
      const res = await fetch('/api/proxy/credentials');
      if (res.ok) {
        const serverCreds = await res.json();
        if (serverCreds && Object.keys(serverCreds).length > 0) {
          // Merge non-empty server credentials
          let changed = false;
          const merged = { ...this.credentials };
          for (const [k, v] of Object.entries(serverCreds)) {
            if (v !== undefined && v !== null && v !== '') {
              if ((merged as any)[k] !== v) {
                (merged as any)[k] = v;
                changed = true;
              }
            }
          }
          if (changed) {
            this.credentials = merged;
            this.save();
            this.subscribers.forEach((cb) => cb());
          }
        }
      }
    } catch (e) {}
  }

  public static getInstance(): SettingsStore {
    if (!SettingsStore.instance) {
      SettingsStore.instance = new SettingsStore();
    }
    return SettingsStore.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify(triggerSave = true) {
    if (triggerSave) {
      this.save();
    }
    this.subscribers.forEach((cb) => cb());
  }

  private save() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // 1. Save credentials to permanent key
    localStorage.setItem(PERMANENT_CREDENTIALS_KEY, JSON.stringify(this.credentials));

    // 2. Save full settings
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        credentials: this.credentials,
        couriers: this.couriers,
        services: this.services,
        pricing: this.pricing,
        dropShop: this.dropShop,
      })
    );
  }

  public async updateCredentials(updates: Partial<ApiCredentials>) {
    this.credentials = { ...this.credentials, ...updates };
    this.notify(true);

    // Persist to server disk as well
    try {
      await fetch('/api/proxy/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.credentials),
      });
    } catch (e) {}
  }

  public toggleCourier(courierKey: string, enabled?: boolean) {
    this.couriers = this.couriers.map((c) =>
      c.key.toLowerCase() === courierKey.toLowerCase() ? { ...c, enabled: enabled !== undefined ? enabled : !c.enabled } : c
    );
    this.notify(true);
  }

  public toggleService(serviceId: string, enabled?: boolean) {
    this.services = this.services.map((s) =>
      s.dc_service_id === serviceId ? { ...s, enabled: enabled !== undefined ? enabled : !s.enabled } : s
    );
    this.notify(true);
  }

  public updateService(serviceId: string, updates: Partial<ConfiguredService>) {
    this.services = this.services.map((s) =>
      s.dc_service_id === serviceId ? { ...s, ...updates } : s
    );
    this.notify(true);
  }

  public addServices(newServices: ConfiguredService[]) {
    const existingMap = new Map(this.services.map((s) => [s.dc_service_id, s]));
    newServices.forEach((s) => {
      if (!existingMap.has(s.dc_service_id)) {
        this.services.push(s);
      }
    });
    this.notify(true);
  }

  public deleteService(serviceId: string) {
    this.services = this.services.filter((s) => s.dc_service_id !== serviceId);
    this.notify(true);
  }

  public setServices(services: ConfiguredService[]) {
    this.services = services;
    this.notify(true);
  }

  public resetServicesToDefaults() {
    this.services = [...INITIAL_SERVICES];
    this.notify(true);
  }

  public updatePricing(updates: Partial<PricingRules>) {
    this.pricing = { ...this.pricing, ...updates };
    this.notify(true);
  }

  public updateDropShop(updates: Partial<DropShopSettings>) {
    this.dropShop = { ...this.dropShop, ...updates };
    this.notify(true);
  }

  public clearLogs() {
    this.logs = [];
    this.subscribers.forEach((cb) => cb());
  }

  public resetToDefaults(resetCredentials = false) {
    if (resetCredentials) {
      this.credentials = DEFAULT_CREDENTIALS;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PERMANENT_CREDENTIALS_KEY);
      }
    }
    this.couriers = INITIAL_COURIERS;
    this.services = INITIAL_SERVICES;
    this.pricing = DEFAULT_PRICING;
    this.dropShop = DEFAULT_DROPSHOP;
    this.logs = [];
    this.notify(true);
  }
}
