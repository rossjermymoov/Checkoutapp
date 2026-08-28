// Merchant Settings & Configuration Types

export interface ApiCredentials {
  voilaApiUser: string;
  voilaApiToken: string;
  voilaAuthCompany: string;
  billingClientName: string;
  billingCustomerDcId: string;
  billingCustomerKey: string;
  billingEndpointUrl: string;
  useLiveApi: boolean;
}

export interface CourierConfig {
  key: string;
  name: string;
  logo: string;
  enabled: boolean;
  authCompanyOverride?: string;
}

export interface ConfiguredService {
  dc_service_id: string;
  courier: string;
  originalName: string;
  displayName: string;
  leadTime: string;
  enabled: boolean;
  priority: number;
  priceOverride?: number | null;
  badgeText?: string | null;
  isDropShop?: boolean;
  /**
   * A service sold for WHEN it delivers, not how fast. Saturday, Sunday and
   * timed services all report lead_time "Next Day" in Voila, so speed-and-price
   * comparison cannot tell them apart. Premium services are exempt from it.
   */
  isPremium?: boolean;
}

/** Where the order is going, relative to the shipping origin (GB). */
export type RuleDestination = 'any' | 'domestic' | 'international';

/**
 * What a rule does to the price it receives. Rules form a pipeline: each
 * matching rule transforms the running price and passes it to the next.
 */
export type PricingAction =
  | { type: 'passthrough' }
  | { type: 'add_fixed'; amount: number }
  | { type: 'add_percentage'; percent: number }
  | { type: 'set_price'; amount: number }
  | { type: 'round_up_to'; increment: number }
  | { type: 'round_nearest'; increment: number }
  | { type: 'minimum_price'; amount: number }
  | { type: 'maximum_price'; amount: number }
  | { type: 'free' };

export type PricingActionType = PricingAction['type'];

/** Every condition is optional. An empty array or null means "any". */
export interface PricingRuleConditions {
  couriers: string[];
  serviceIds: string[];
  destination: RuleDestination;
  /** ISO-2 country codes. Ignored when empty. */
  countries: string[];
  minOrderValue: number | null;
  maxOrderValue: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  /** Band on the price entering this rule, not the original quote. */
  minPrice: number | null;
  maxPrice: number | null;
  /** null = any, true = pickup point only, false = doorstep only. */
  dropShopOnly: boolean | null;
}

export interface PricingRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: PricingRuleConditions;
  action: PricingAction;
  /** Stop evaluating later rules once this one has been applied. */
  stopIfMatched: boolean;
}

export interface DropShopSettings {
  enabled: boolean;
  maxRadiusMiles: number;
  maxLocations: number;
  enabledCouriers: string[];
}

export interface OriginWarehouseAddress {
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  county: string;
  country_iso: string;
  tax_id: string;
  eori_id: string;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: any;
  durationMs: number;
  success: boolean;
  source: 'live' | 'mock';
}
