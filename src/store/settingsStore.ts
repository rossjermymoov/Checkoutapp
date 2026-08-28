import { ApiCredentials, ConfiguredService, CourierConfig, PricingRule, DropShopSettings } from '../types/settings';
import { emptyConditions } from '../services/pricingRules';
import { setActiveTenant } from '../services/api';
import { ApiLogEntry } from '../types/api';
import { INITIAL_COURIERS } from '../services/mockData';
import { setApiLogListener } from '../services/api';

// v4: the fictional default services (UPS-STANDARD, DPD-NEXT-DAY,
// DPD-PICKUP, UPS-ACCESS-POINT) were removed. Bumping the key stops them
// being resurrected from a browser that still holds the old list.
/**
 * Stable storage key. DO NOT BUMP THIS AGAIN.
 *
 * Bumping the key for a schema change silently discards the merchant's
 * configuration — it cost this user their service selections twice. Schema
 * changes are handled by migrateSettings() below, which reads whatever shape is
 * on disk and brings it forward. Add a migration step, raise SCHEMA_VERSION,
 * and leave the key alone.
 */
const STORAGE_KEY = 'checkout_demo_settings';
const SCHEMA_VERSION = 3;

/** Older keys, newest first. Read once to rescue configuration written before
 *  the stable key existed. */
const LEGACY_STORAGE_KEYS = [
  'checkout_demo_settings_v5',
  'checkout_demo_settings_v4',
  'checkout_demo_settings_v3',
];

/** Service codes that never existed upstream. Never resurrect them. */
const FICTIONAL_SERVICE_IDS = new Set([
  'UPS-STANDARD',
  'DPD-NEXT-DAY',
  'DPD-PICKUP',
  'UPS-ACCESS-POINT',
  'DPD-12PM',
  'UPS-EXPRESS-SAVER',
]);

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

/** No rules means the carrier's quote passes through untouched. */
const DEFAULT_PRICING_RULES: PricingRule[] = [];

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


/**
 * Read whatever settings exist, from the stable key or any legacy key, and
 * bring the shape forward. Returns null when nothing has ever been saved.
 */
function readStoredSettings(): any | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return migrateSettings(parsed);
      }
    } catch (e) {
      // Corrupt entry — try the next key rather than losing everything.
    }
  }
  return null;
}

/**
 * Bring any previously stored shape up to the current one. Every step must be
 * safe to run on already-current data, because the stable key is re-read on
 * every load.
 */
export function migrateSettings(parsed: any): any {
  const out = { ...parsed };

  // Services: drop the fabricated ones and anything for a courier that was
  // removed, and make sure the doorstep/pickup flag exists.
  if (Array.isArray(out.services)) {
    out.services = out.services
      .filter((s: any) => s && s.dc_service_id)
      .filter((s: any) => !FICTIONAL_SERVICE_IDS.has(s.dc_service_id))
      .filter((s: any) => s.courier !== 'InPost')
      .map((s: any) => ({ ...s, isDropShop: Boolean(s.isDropShop) }));
  }

  // Legacy single-markup pricing -> ordered rule list.
  if (!Array.isArray(out.pricingRules)) {
    const legacy = out.pricing;
    const rules: PricingRule[] = [];

    if (legacy && typeof legacy === 'object') {
      // Free-over-threshold ran regardless of markup, so it goes first and stops.
      if (legacy.freeShippingThreshold != null) {
        rules.push({
          id: 'migrated_free_threshold',
          name: `Free delivery over £${legacy.freeShippingThreshold}`,
          enabled: true,
          conditions: { ...emptyConditions(), minOrderValue: Number(legacy.freeShippingThreshold) },
          action: { type: 'free' },
          stopIfMatched: true,
        });
      }
      if (legacy.markupType === 'fixed' && Number(legacy.markupValue) > 0) {
        rules.push({
          id: 'migrated_markup',
          name: 'Handling surcharge',
          enabled: true,
          conditions: emptyConditions(),
          action: { type: 'add_fixed', amount: Number(legacy.markupValue) },
          stopIfMatched: false,
        });
      } else if (legacy.markupType === 'percentage' && Number(legacy.markupValue) > 0) {
        rules.push({
          id: 'migrated_markup',
          name: 'Margin',
          enabled: true,
          conditions: emptyConditions(),
          action: { type: 'add_percentage', percent: Number(legacy.markupValue) },
          stopIfMatched: false,
        });
      }
    }

    out.pricingRules = rules;
  }
  delete out.pricing;

  out.schemaVersion = SCHEMA_VERSION;
  return out;
}

export class SettingsStore {
  private static instance: SettingsStore;
  private subscribers = new Set<() => void>();

  public credentials: ApiCredentials;
  public couriers: CourierConfig[];
  public services: ConfiguredService[];
  public pricingRules: PricingRule[];
  public dropShop: DropShopSettings;
  /**
   * Hide a service when another from the same courier is both at least as fast
   * and at least as cheap. On by default — showing a slower service at the same
   * money is a choice with no upside.
   */
  public hideDominatedServices: boolean = true;
  /** Set on a /c/<slug> customer view; sent as x-tenant on API calls. */
  public tenantSlug: string | null = null;
  public logs: ApiLogEntry[] = [];

  private constructor() {
    this.credentials = loadPersistedCredentials();
    this.couriers = INITIAL_COURIERS;
    this.services = INITIAL_SERVICES;
    this.pricingRules = [...DEFAULT_PRICING_RULES];
    this.dropShop = DEFAULT_DROPSHOP;

    const parsed = readStoredSettings();
    if (parsed) {
      try {
        if (parsed.credentials) {
          this.credentials = { ...this.credentials, ...parsed.credentials };
        }
        this.couriers = parsed.couriers || INITIAL_COURIERS;
        // migrateSettings has already stripped fictional and removed-courier
        // services, so this is just the assignment.
        this.services = Array.isArray(parsed.services) ? parsed.services : INITIAL_SERVICES;
        if (Array.isArray(parsed.pricingRules)) this.pricingRules = parsed.pricingRules;
        this.dropShop = { ...DEFAULT_DROPSHOP, ...(parsed.dropShop || {}) };
        if (typeof parsed.hideDominatedServices === 'boolean') {
          this.hideDominatedServices = parsed.hideDominatedServices;
        }
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

    // A browser with no stored configuration adopts the host's, so a deployed
    // demo is not blank for everyone except the person who configured it.
    if (!parsed) this.adoptServerSettings();
  }

  private async adoptServerSettings() {
    try {
      const res = await fetch('/api/proxy/settings');
      if (!res.ok) return;
      const body = await res.json();
      if (!body?.configured || !body.settings) return;

      const s = migrateSettings(body.settings);
      if (Array.isArray(s.services)) this.services = s.services;
      if (Array.isArray(s.pricingRules)) this.pricingRules = s.pricingRules;
      if (Array.isArray(s.couriers)) this.couriers = s.couriers;
      if (s.dropShop) this.dropShop = { ...this.dropShop, ...s.dropShop };
      if (typeof s.hideDominatedServices === 'boolean') {
        this.hideDominatedServices = s.hideDominatedServices;
      }
      this.notify(true);
    } catch (e) {
      // Offline or not configured — the app still runs, just unconfigured.
    }
  }

  /**
   * Load a customer's configuration for a /c/<slug> view. Held in memory only:
   * a customer's browser must not have the merchant's own configuration
   * overwritten by a demo link, or vice versa.
   */
  public applyTenantSettings(slug: string, incoming: any) {
    this.tenantSlug = slug;
    setActiveTenant(slug);
    if (!incoming) {
      this.notify(false);
      return;
    }
    const s = migrateSettings(incoming);
    if (Array.isArray(s.services)) this.services = s.services;
    if (Array.isArray(s.pricingRules)) this.pricingRules = s.pricingRules;
    if (Array.isArray(s.couriers)) this.couriers = s.couriers;
    if (s.dropShop) this.dropShop = { ...this.dropShop, ...s.dropShop };
    if (typeof s.hideDominatedServices === 'boolean') {
      this.hideDominatedServices = s.hideDominatedServices;
    }
    this.notify(false);
  }

  /** Configuration as JSON for CHECKOUT_SETTINGS_JSON. Never includes secrets. */
  public exportConfiguration(): string {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      couriers: this.couriers,
      services: this.services,
      pricingRules: this.pricingRules,
      dropShop: this.dropShop,
      hideDominatedServices: this.hideDominatedServices,
    });
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
    // A customer view never writes back — it is showing someone else's setup.
    if (this.tenantSlug) return;

    // 1. Save credentials to permanent key
    localStorage.setItem(PERMANENT_CREDENTIALS_KEY, JSON.stringify(this.credentials));

    // 2. Save full settings
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        credentials: this.credentials,
        couriers: this.couriers,
        services: this.services,
        pricingRules: this.pricingRules,
        dropShop: this.dropShop,
        hideDominatedServices: this.hideDominatedServices,
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

  public setPricingRules(rules: PricingRule[]) {
    this.pricingRules = rules;
    this.notify(true);
  }

  public addPricingRule(rule: PricingRule) {
    this.pricingRules = [...this.pricingRules, rule];
    this.notify(true);
  }

  public updatePricingRule(id: string, updates: Partial<PricingRule>) {
    this.pricingRules = this.pricingRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    this.notify(true);
  }

  public deletePricingRule(id: string) {
    this.pricingRules = this.pricingRules.filter((r) => r.id !== id);
    this.notify(true);
  }

  /** Order is significant — rounding rules generally belong last. */
  public movePricingRule(id: string, direction: -1 | 1) {
    const idx = this.pricingRules.findIndex((r) => r.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= this.pricingRules.length) return;
    const next = [...this.pricingRules];
    [next[idx], next[target]] = [next[target], next[idx]];
    this.pricingRules = next;
    this.notify(true);
  }

  public setHideDominatedServices(value: boolean) {
    this.hideDominatedServices = value;
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
    this.pricingRules = [...DEFAULT_PRICING_RULES];
    this.dropShop = DEFAULT_DROPSHOP;
    this.logs = [];
    this.notify(true);
  }
}
