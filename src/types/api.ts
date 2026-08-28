// Types for Voila & Billing API structures
export type { ApiLogEntry } from './settings';

export interface VoilaPreset {
  id: number;
  dc_service_id: string;
  api_user_id: number | null;
  courier: string;
  name: string;
  json?: string;
  rule_weight_min?: number | null;
  rule_weight_max?: number | null;
  rule_length_min?: number | null;
  rule_length_max?: number | null;
  rule_width_min?: number | null;
  rule_width_max?: number | null;
  rule_height_min?: number | null;
  rule_height_max?: number | null;
  rule_supported_countries?: string | null;
  lead_time?: string | null;
}

export interface PresetsApiResponse {
  presets?: VoilaPreset[];
  user_presets?: VoilaPreset[];
}

export interface PickupLocationDayWindow {
  pickupLocationOpenWindowStartTime: string;
  pickupLocationOpenWindowEndTime: string;
  pickupLocationOpenWindowDay: number; // 1 = Monday, 7 = Sunday
}

export interface PickupLocationItem {
  pickupLocation: {
    pickupLocationCode: string;
    address: {
      organisation?: string;
      property?: string;
      street?: string;
      locality?: string;
      town?: string;
      county?: string;
      postcode: string;
      countryCode: string;
    };
    pickupLocationType?: string;
    addressPoint?: {
      latitude: number;
      longitude: number;
    };
    languageSpoken?: string;
    disabledAccess?: boolean;
    parkingAvailable?: boolean;
    pickupLocationDirections?: string;
    pickupLocationAvailability?: {
      pickupLocationActiveStart?: string;
      pickupLocationOpenWindow?: PickupLocationDayWindow[];
    };
    openLate?: boolean;
    openSaturday?: boolean;
    openSunday?: boolean;
    shortName?: string;
    pickupLocationImageUrl?: string | null;
    depotDescription?: string;
    courier?: string;
  };
  distance: number; // in miles or km
  addressPoint?: {
    latitude: number;
    longitude: number;
  };
}

export interface BillingQuoteItem {
  service_code: string;
  service_name: string;
  courier?: string;
  lead_time?: string;
  price: {
    shipping: number[];
    picking?: number;
    parcel_rules?: Array<Array<{ rule: string; charge: number }>>;
    packaging_charges?: number[];
    total: number;
  };
}

export interface CourierInfo {
  key: string;
  name: string;
  logo: string;
  thumbnail: string;
  status: string;
}
