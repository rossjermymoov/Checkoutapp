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
  badgeText?: string;
  isDropShop?: boolean;
}

export interface PricingRules {
  markupType: 'none' | 'fixed' | 'percentage';
  markupValue: number;
  freeShippingThreshold: number | null; // e.g. £50
  defaultFallbackRate: number;
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
