import { ApiCredentials, ConfiguredService, CourierConfig, PricingRules, DropShopSettings } from '../types/settings';
import { ApiLogEntry } from '../types/api';
import { INITIAL_COURIERS, MOCK_PRESETS_BY_COURIER } from '../services/mockData';
import { setApiLogListener } from '../services/api';

const STORAGE_KEY = 'checkout_demo_settings_v2';

const INITIAL_SERVICES: ConfiguredService[] = [
  {
    dc_service_id: "DPD-NEXT-DAY",
    courier: "DPD",
    originalName: "DPD Next Day Standard",
    displayName: "DPD Next Day Priority",
    leadTime: "Next Working Day (1-hr window)",
    enabled: true,
    priority: 1,
    isDropShop: false,
    badgeText: "Fastest",
    priceOverride: null,
  },
  {
    dc_service_id: "DPD-12PM",
    courier: "DPD",
    originalName: "DPD Priority by 12:00 PM",
    displayName: "DPD Express Pre-Noon",
    leadTime: "Next Day before 12:00",
    enabled: true,
    priority: 2,
    isDropShop: false,
    badgeText: null,
    priceOverride: null,
  },
  {
    dc_service_id: "EVRI-STANDARD",
    courier: "Evri",
    originalName: "Evri Standard Tracked",
    displayName: "Evri Standard Tracked",
    leadTime: "2-3 Business Days",
    enabled: true,
    priority: 3,
    isDropShop: false,
    badgeText: "Best Value",
    priceOverride: null,
  },
  {
    dc_service_id: "EVRI-NEXT-DAY",
    courier: "Evri",
    originalName: "Evri Next Day Delivery",
    displayName: "Evri Next Day Tracked",
    leadTime: "Next Working Day",
    enabled: true,
    priority: 4,
    isDropShop: false,
    badgeText: null,
    priceOverride: null,
  },
  {
    dc_service_id: "UPS-STANDARD",
    courier: "UPS",
    originalName: "UPS Standard Ground",
    displayName: "UPS Carbon Neutral Ground",
    leadTime: "1-2 Business Days",
    enabled: true,
    priority: 5,
    isDropShop: false,
    badgeText: null,
    priceOverride: null,
  },
  {
    dc_service_id: "RM-TRACKED-24",
    courier: "RoyalMail",
    originalName: "Royal Mail Tracked 24",
    displayName: "Royal Mail Tracked 24",
    leadTime: "1-2 Days Guaranteed",
    enabled: true,
    priority: 6,
    isDropShop: false,
    badgeText: null,
    priceOverride: null,
  },
  {
    dc_service_id: "DPD-PICKUP",
    courier: "DPD",
    originalName: "DPD Pickup ParcelShop Collect",
    displayName: "DPD Local ParcelShop Collection",
    leadTime: "Next Day to Local Store",
    enabled: true,
    priority: 7,
    isDropShop: true,
    badgeText: "Eco-Friendly",
    priceOverride: null,
  },
  {
    dc_service_id: "INPOST-LOCKER-24",
    courier: "InPost",
    originalName: "InPost 24/7 Automated Locker",
    displayName: "InPost 24/7 Parcel Locker",
    leadTime: "Next Day 24/7 Pickup",
    enabled: true,
    priority: 8,
    isDropShop: true,
    badgeText: "24/7 Pickup",
    priceOverride: null,
  }
];

const DEFAULT_CREDENTIALS: ApiCredentials = {
  voilaApiUser: 'ross.jermy@gmail.com',
  voilaApiToken: 'voila_live_sec_789412984102',
  voilaAuthCompany: 'YTC',
  billingClientName: 'Moov Parcel',
  billingCustomerDcId: 'Kitloop',
  billingCustomerKey: 'b62e9045a42d43468840c6e07b568fcd',
  billingEndpointUrl: 'https://production.billingapi.co.uk/api/customer-routes/get-quote',
  useLiveApi: false,
};

const DEFAULT_PRICING: PricingRules = {
  markupType: 'none',
  markupValue: 0,
  freeShippingThreshold: 150,
  defaultFallbackRate: 4.95,
};

const DEFAULT_DROPSHOP: DropShopSettings = {
  enabled: true,
  maxRadiusMiles: 5,
  maxLocations: 8,
  enabledCouriers: ['DPD', 'InPost', 'Evri', 'UPS'],
};

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.credentials = { ...DEFAULT_CREDENTIALS, ...(parsed.credentials || {}) };
        this.couriers = parsed.couriers || INITIAL_COURIERS;
        this.services = parsed.services || INITIAL_SERVICES;
        this.pricing = { ...DEFAULT_PRICING, ...(parsed.pricing || {}) };
        this.dropShop = { ...DEFAULT_DROPSHOP, ...(parsed.dropShop || {}) };
      } catch (e) {
        this.credentials = DEFAULT_CREDENTIALS;
        this.couriers = INITIAL_COURIERS;
        this.services = INITIAL_SERVICES;
        this.pricing = DEFAULT_PRICING;
        this.dropShop = DEFAULT_DROPSHOP;
      }
    } else {
      this.credentials = DEFAULT_CREDENTIALS;
      this.couriers = INITIAL_COURIERS;
      this.services = INITIAL_SERVICES;
      this.pricing = DEFAULT_PRICING;
      this.dropShop = DEFAULT_DROPSHOP;
    }

    setApiLogListener((entry) => {
      this.logs = [entry, ...this.logs.slice(0, 49)];
      this.notify();
    });
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

  private notify() {
    this.save();
    this.subscribers.forEach((cb) => cb());
  }

  private save() {
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

  public updateCredentials(updates: Partial<ApiCredentials>) {
    this.credentials = { ...this.credentials, ...updates };
    this.notify();
  }

  public toggleCourier(courierKey: string, enabled?: boolean) {
    this.couriers = this.couriers.map((c) =>
      c.key === courierKey ? { ...c, enabled: enabled !== undefined ? enabled : !c.enabled } : c
    );
    this.notify();
  }

  public toggleService(serviceId: string, enabled?: boolean) {
    this.services = this.services.map((s) =>
      s.dc_service_id === serviceId ? { ...s, enabled: enabled !== undefined ? enabled : !s.enabled } : s
    );
    this.notify();
  }

  public updateService(serviceId: string, updates: Partial<ConfiguredService>) {
    this.services = this.services.map((s) =>
      s.dc_service_id === serviceId ? { ...s, ...updates } : s
    );
    this.notify();
  }

  public addServices(newServices: ConfiguredService[]) {
    const existingMap = new Map(this.services.map((s) => [s.dc_service_id, s]));
    newServices.forEach((s) => {
      if (!existingMap.has(s.dc_service_id)) {
        this.services.push(s);
      }
    });
    this.notify();
  }

  public updatePricing(updates: Partial<PricingRules>) {
    this.pricing = { ...this.pricing, ...updates };
    this.notify();
  }

  public updateDropShop(updates: Partial<DropShopSettings>) {
    this.dropShop = { ...this.dropShop, ...updates };
    this.notify();
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public resetToDefaults() {
    this.credentials = DEFAULT_CREDENTIALS;
    this.couriers = INITIAL_COURIERS;
    this.services = INITIAL_SERVICES;
    this.pricing = DEFAULT_PRICING;
    this.dropShop = DEFAULT_DROPSHOP;
    this.logs = [];
    this.notify();
  }
}
