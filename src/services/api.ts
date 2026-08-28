import { ApiCredentials } from '../types/settings';
import { VoilaPreset, PickupLocationItem, ApiLogEntry, QuotedService } from '../types/api';
import { CustomerDetails } from '../types/checkout';
import { generatePostcodeAccuratePickupLocations } from './geoService';

// Neutral fallback address used when the customer form is empty. Deliberately not
// a real person's contact details — this repo is public.
const DEMO_ADDRESS = {
  name: 'Demo Customer',
  phone: '07000000000',
  email: 'demo@example.com',
  address1: 'Roebuck Lane',
  city: 'Birmingham',
  county: 'West Midlands',
  postcode: 'B66 1BY',
};

// Active customer tenant, sent as x-tenant so the server can resolve that
// customer's own carrier credentials. Set by the store rather than imported
// from it, to avoid a circular dependency.
let activeTenant: string | null = null;
export const setActiveTenant = (slug: string | null) => {
  activeTenant = slug;
};
const tenantHeader = (): Record<string, string> => (activeTenant ? { 'x-tenant': activeTenant } : {});

// Global logger subscriber
type LogListener = (entry: ApiLogEntry) => void;
let logListener: LogListener | null = null;

export const setApiLogListener = (listener: LogListener) => {
  logListener = listener;
};

const emitLog = (entry: ApiLogEntry) => {
  if (logListener) {
    logListener(entry);
  }
};

// Safe fetch response parser to prevent unexpected token syntax errors
async function safeParseResponse(res: Response): Promise<{ data: any; isJson: boolean; rawText: string }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { data, isJson: true, rawText: text };
  } catch (e) {
    return {
      data: {
        error: `Server returned non-JSON response (HTTP ${res.status})`,
        message: text.substring(0, 300) || 'Empty or invalid response',
      },
      isJson: false,
      rawText: text,
    };
  }
}

// Voila returns presets wrapped in an object: { user_presets: [...], system_presets: [...] }
// It is NOT a bare array. Treating a 200 response as a failure because it isn't an
// array is what previously caused valid live data to be discarded in favour of mocks.
export function extractPresets(data: any): VoilaPreset[] {
  if (Array.isArray(data)) {
    return data.filter((d) => d && typeof d === 'object');
  }
  if (data && typeof data === 'object') {
    const merged = [
      ...(Array.isArray(data.user_presets) ? data.user_presets : []),
      ...(Array.isArray(data.system_presets) ? data.system_presets : []),
      ...(Array.isArray(data.presets) ? data.presets : []),
      ...(Array.isArray(data.data) ? data.data : []),
      ...(Array.isArray(data.services) ? data.services : []),
    ];
    // De-duplicate by dc_service_id, preferring the first (user presets win).
    const seen = new Set<string>();
    return merged.filter((p: any) => {
      const key = p?.dc_service_id || String(p?.id ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return [];
}

// Pull a human-readable error out of whatever shape Voila returned.
// Voila's auth failures come back as a bare array of strings, e.g.
// ["No api-user set in header"] — which is the most useful message there is.
function extractError(data: any, status: number, fallback: string): string {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
    return data.join(', ');
  }
  if (data && typeof data === 'object') {
    const msg = data.error || data.message || data.detail || (data.raw ? String(data.raw).substring(0, 200) : null);
    if (msg) return typeof msg === 'string' ? msg : JSON.stringify(msg);
  }
  if (typeof data === 'string' && data.trim()) return data.substring(0, 200);
  return `HTTP ${status}: ${fallback}`;
}

// Each courier returns pickup locations in its own shape. DPD uses the nested
// { pickupLocation, distance, addressPoint } structure the UI expects; Yodel
// returns flat site records with completely different field names. Normalise
// everything to PickupLocationItem before it reaches the store.
export function normalisePickupLocations(courier: string, data: any[]): PickupLocationItem[] {
  return data
    .map((item: any): PickupLocationItem | null => {
      if (!item || typeof item !== 'object') return null;

      // DPD / UPS style — already the expected shape.
      if (item.pickupLocation) {
        const point = item.addressPoint || item.pickupLocation.addressPoint;
        return {
          ...item,
          pickupLocation: {
            ...item.pickupLocation,
            courier: item.pickupLocation.courier || courier,
          },
          distance: typeof item.distance === 'number' ? item.distance : 0,
          addressPoint: point,
        };
      }

      // Yodel style — flat site record.
      if (item.site_number || item.site_name) {
        const closingTimes = [item.monday_close, item.saturday_close, item.sunday_close].filter(Boolean);
        const opensLate = closingTimes.some((t: string) => Number(String(t).substring(0, 2)) >= 21);
        return {
          pickupLocation: {
            pickupLocationCode: String(item.site_number || ''),
            address: {
              organisation: item.site_name || item.dcl_site_name || 'Yodel Store',
              street: item.address || '',
              town: item.city || '',
              county: item.county || '',
              postcode: item.postcode || '',
              countryCode: 'GB',
            },
            shortName: item.site_name || undefined,
            openLate: opensLate,
            disabledAccess: Boolean(item.disabled_access_code),
            addressPoint:
              item.lat != null && item.long != null
                ? { latitude: Number(item.lat), longitude: Number(item.long) }
                : undefined,
            courier,
          },
          // Yodel already returns distance in miles.
          distance: typeof item.miles === 'number' ? item.miles : Number(item.miles) || 0,
          addressPoint:
            item.lat != null && item.long != null
              ? { latitude: Number(item.lat), longitude: Number(item.long) }
              : undefined,
        };
      }

      return null;
    })
    .filter((x): x is PickupLocationItem => x !== null);
}

/**
 * UPS live negotiated rates, via the server.
 *
 * The browser sends the destination and the parcels and receives a service name,
 * a total and a transit time. The OAuth credentials, the account number, the
 * negotiated cost and the charge breakdown all stay on the server.
 */
export async function getUpsQuote(
  customer: CustomerDetails,
  parcels: Array<{ weightKg: number; quantity: number }>,
  orderValue: number
): Promise<{ services: QuotedService[]; transitDays: Record<string, number | null>; error?: string }> {
  const res = await fetch('/api/proxy/ups-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeader() },
    body: JSON.stringify({
      shipTo: {
        name: `${customer.firstName} ${customer.lastName}`.trim() || DEMO_ADDRESS.name,
        address1: customer.address1 || DEMO_ADDRESS.address1,
        city: customer.city || DEMO_ADDRESS.city,
        postcode: customer.postcode || DEMO_ADDRESS.postcode,
        countryIso: customer.countryIso || 'GB',
      },
      parcels,
      orderValue,
    }),
  }).catch(() => null);

  if (!res) return { services: [], transitDays: {}, error: 'Could not reach the server.' };

  const { data, isJson } = await safeParseResponse(res);
  if (!res.ok) {
    return { services: [], transitDays: {}, error: extractError(data, res.status, 'UPS rating failed') };
  }

  const services: QuotedService[] = [];
  const transitDays: Record<string, number | null> = {};
  (isJson ? data.services || [] : []).forEach((s: any) => {
    const code = `UPS-RATE-${s.serviceCode}`;
    services.push({ code, name: s.serviceName, courier: 'UPS', price: Number(s.price) });
    transitDays[code] = s.daysInTransit ?? null;
  });

  return { services, transitDays };
}

// 1. HeyVoila / MoovParcel API: Get Presets (GET /api/couriers/v1/MoovParcel/presets)
export async function getMoovParcelPresets(
  credentials: ApiCredentials
): Promise<{ presets: VoilaPreset[]; fromLive: boolean; error?: string }> {
  const startTime = Date.now();
  const endpoint = `/api/proxy/presets/MoovParcel`;
  const headers: Record<string, string> = {
    'api-user': credentials.voilaApiUser || '',
    'api-token': credentials.voilaApiToken || '',
    ...tenantHeader(),
  };

  try {
    const res = await fetch(endpoint, {
      headers,
      method: 'GET',
    });

    const { data, isJson } = await safeParseResponse(res);
    const durationMs = Date.now() - startTime;

    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets`,
      method: 'GET',
      headers,
      responseStatus: res.status,
      responseBody: data,
      durationMs,
      success: res.ok && isJson && extractPresets(data).length > 0,
      source: 'live'
    });

    const presetList = extractPresets(data);

    if (!res.ok || presetList.length === 0) {
      return {
        presets: [],
        fromLive: false,
        error: extractError(
          data,
          res.status,
          res.status === 401
            ? 'Authentication required. Check api-user and api-token.'
            : 'Failed to fetch MoovParcel presets'
        ),
      };
    }

    return { presets: presetList, fromLive: true };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/MoovParcel/presets`,
      method: 'GET',
      headers,
      responseStatus: 500,
      responseBody: { error: err.message },
      durationMs,
      success: false,
      source: 'live'
    });
    return { presets: [], fromLive: false, error: err.message };
  }
}

// 1b. Generic Courier Presets
export async function getCourierPresets(
  courier: string,
  credentials: ApiCredentials
): Promise<{ presets: VoilaPreset[]; fromLive: boolean; error?: string }> {
  const startTime = Date.now();
  const endpoint = `/api/proxy/presets/${encodeURIComponent(courier)}`;
  const headers: Record<string, string> = {
    'api-user': credentials.voilaApiUser,
    'api-token': credentials.voilaApiToken,
    ...tenantHeader(),
  };

  // Sandbox mode still reads the real catalogue: knowing which services exist
  // is not the same as quoting them, and inventing service codes here is what
  // made the console look configured when it was not.

  try {
    const res = await fetch(endpoint, {
      headers,
      method: 'GET',
    });

    const { data, isJson } = await safeParseResponse(res);
    const durationMs = Date.now() - startTime;

    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/presets`,
      method: 'GET',
      headers,
      responseStatus: res.status,
      responseBody: data,
      durationMs,
      success: res.ok && isJson && extractPresets(data).length > 0,
      source: 'live'
    });

    const presetList = extractPresets(data);

    if (!res.ok || presetList.length === 0) {
      console.warn(`[API] Live presets failed for ${courier}:`, data);
      return {
        presets: [],
        fromLive: false,
        error: extractError(data, res.status, `Failed to fetch presets for ${courier}`)
      };
    }

    return { presets: presetList, fromLive: true };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/presets`,
      method: 'GET',
      headers,
      responseStatus: 500,
      responseBody: { error: err.message },
      durationMs,
      success: false,
      source: 'live'
    });
    return { presets: [], fromLive: false, error: err.message };
  }
}

// 2. HeyVoila API: Get Pickup Locations (POST /api/couriers/v1/:courier/get-pickup-locations)
export async function getPickupLocations(
  courier: string,
  customer: CustomerDetails,
  credentials: ApiCredentials
): Promise<{ locations: PickupLocationItem[]; fromLive: boolean; error?: string }> {
  const startTime = Date.now();
  const endpoint = `/api/proxy/pickup-locations/${encodeURIComponent(courier)}`;
  const headers: Record<string, string> = {
    'api-user': credentials.voilaApiUser,
    'api-token': credentials.voilaApiToken,
    'Content-Type': 'application/json',
    ...tenantHeader(),
  };

  const body = {
    testing: true,
    // Left blank when unset so the server can inject VOILA_AUTH_COMPANY.
    auth_company: credentials.voilaAuthCompany || '',
    address: {
      name: `${customer.firstName} ${customer.lastName}`.trim() || DEMO_ADDRESS.name,
      phone: customer.phone || DEMO_ADDRESS.phone,
      email: customer.email || DEMO_ADDRESS.email,
      company_name: '',
      address_1: customer.address1 || DEMO_ADDRESS.address1,
      address_2: customer.address2 || '',
      address_3: '',
      city: customer.city || DEMO_ADDRESS.city,
      county: customer.county || DEMO_ADDRESS.county,
      postcode: customer.postcode || DEMO_ADDRESS.postcode,
      country_iso: customer.countryIso || 'GB',
    }
  };

  if (!credentials.useLiveApi) {
    const locations = generatePostcodeAccuratePickupLocations(customer, courier ? [courier] : ['DPD', 'UPS', 'Yodel', 'InPost']);
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/get-pickup-locations`,
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: locations,
      durationMs: 78,
      success: true,
      source: 'mock'
    });
    return { locations, fromLive: false };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const { data, isJson } = await safeParseResponse(res);
    const durationMs = Date.now() - startTime;

    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/get-pickup-locations`,
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: res.status,
      responseBody: data,
      durationMs,
      success: res.ok && isJson && Array.isArray(data),
      source: 'live'
    });

    if (!res.ok || !Array.isArray(data)) {
      console.warn(`[API] Live pickup locations failed for ${courier}:`, data);
      return {
        locations: [],
        fromLive: false,
        error: extractError(data, res.status, `Failed to fetch pickup locations for ${courier}`)
      };
    }

    // Each courier returns a different record shape; normalise before use.
    const normalised = normalisePickupLocations(courier, data);

    if (normalised.length === 0 && data.length > 0) {
      return {
        locations: [],
        fromLive: false,
        error: `${courier} returned ${data.length} locations in an unrecognised format.`
      };
    }

    return { locations: normalised, fromLive: true };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/get-pickup-locations`,
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: 500,
      responseBody: { error: err.message },
      durationMs,
      success: false,
      source: 'live'
    });
    return { locations: [], fromLive: false, error: err.message };
  }
}

// 3. Billing API: Get Quote (POST https://production.billingapi.co.uk/api/customer-routes/get-quote)
export async function getBillingQuote(
  customer: CustomerDetails,
  credentials: ApiCredentials,
  totalWeightKg: number = 1.5
): Promise<{
  /** Priced, available services. THIS is the list the cart should render. */
  services: QuotedService[];
  quotes: Record<string, number>;
  rawResponse?: any;
  fromLive: boolean;
  error?: string;
}> {
  const startTime = Date.now();
  const endpoint = '/api/proxy/billing-quote';
  const targetUrl = credentials.billingEndpointUrl || 'https://production.billingapi.co.uk/api/customer-routes/get-quote';
  // Empty values are intentional: the proxy falls back to the server's own
  // environment variables, so secrets never have to live in the browser.
  const headers: Record<string, string> = {
    'client_name': credentials.billingClientName || '',
    'customer_dc_id': credentials.billingCustomerDcId || '',
    'customer_key': credentials.billingCustomerKey || '',
    'x-endpoint-url': targetUrl,
    'Content-Type': 'application/json',
    ...tenantHeader(),
  };

  const body = {
    auth_company: credentials.voilaAuthCompany || '',
    format_address_default: true,
    request_id: "req_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
    shipment: {
      label_size: "6x4",
      label_format: "pdf",
      generate_invoice: false,
      generate_packing_slip: false,
      collection_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      reference: "checkout-quote",
      reference_2: "",
      delivery_instructions: "",
      ship_from: {
        name: "Warehouse",
        phone: "01111111111",
        email: "dispatch@example.com",
        company_name: "Logistics Hub",
        address_1: "2 Infirmary Street",
        address_2: "",
        address_3: "",
        city: "Leeds",
        postcode: "LS1 2JP",
        county: "",
        country_iso: "GB",
        company_id: "00000000",
        tax_id: "GB123456789",
        eori_id: "GB123456789000",
        ioss_number: null
      },
      ship_to: {
        name: `${customer.firstName} ${customer.lastName}`.trim() || DEMO_ADDRESS.name,
        phone: customer.phone || DEMO_ADDRESS.phone,
        email: customer.email || DEMO_ADDRESS.email,
        company_name: null,
        address_1: customer.address1 || DEMO_ADDRESS.address1,
        address_2: customer.address2 || "",
        address_3: "",
        city: customer.city || DEMO_ADDRESS.city,
        county: customer.county || DEMO_ADDRESS.county,
        postcode: customer.postcode || DEMO_ADDRESS.postcode,
        country_iso: customer.countryIso || "GB",
        tax_id: null
      },
      parcels: [
        {
          dim_width: 20,
          dim_height: 15,
          dim_length: 30,
          dim_unit: "cm",
          items: [
            {
              description: "Order Items",
              origin_country: "GB",
              quantity: 1,
              value_currency: "GBP",
              weight: totalWeightKg,
              weight_unit: "KG",
              sku: "CART-ITEM-01",
              hs_code: "50000000",
              value: "143.00",
              extended_description: "Apparel and Accessories"
            }
          ]
        }
      ]
    }
  };

  // No fabricated quote branch: sandbox pricing is derived from the merchant's
  // real chosen services (see CheckoutStore.calculateRates), so a service code
  // that does not exist upstream can never appear in the cart.

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const { data, isJson } = await safeParseResponse(res);
    const durationMs = Date.now() - startTime;

    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: credentials.billingEndpointUrl || 'https://production.billingapi.co.uk/api/customer-routes/get-quote',
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: res.status,
      responseBody: data,
      durationMs,
      success: res.ok && isJson,
      source: 'live'
    });

    if (!res.ok) {
      // No silent fallback to mock pricing: an unavailable quote must not be
      // dressed up as a sellable rate. The caller surfaces this to the user.
      console.warn('[API] Live quote failed:', data);
      return {
        services: [],
        quotes: {},
        fromLive: false,
        error: extractError(data, res.status, 'Quote endpoint error')
      };
    }

    // The Billing API returns exactly the services it will carry to this
    // address, already filtered by each service's postcode rules and priced
    // for the destination zone. Take it as the authority on availability.
    const services: QuotedService[] = [];
    const priceMap: Record<string, number> = {};

    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const code = item.service_code || item.dc_service_id;
        const total = item.price?.total ?? item.total ?? (typeof item.price === 'number' ? item.price : undefined);
        if (code && typeof total === 'number') {
          services.push({
            code,
            name: item.service_name || code,
            courier: item.courier || '',
            price: total,
          });
          priceMap[code] = total;
        }
      });
    } else if (data && typeof data === 'object') {
      // Defensive: some deployments return a flat { code: price } map.
      Object.keys(data).forEach((k) => {
        if (typeof data[k] === 'number') {
          services.push({ code: k, name: k, courier: '', price: data[k] });
          priceMap[k] = data[k];
        }
      });
    }

    return {
      services,
      quotes: priceMap,
      rawResponse: data,
      fromLive: true
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: credentials.billingEndpointUrl || 'https://production.billingapi.co.uk/api/customer-routes/get-quote',
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: 500,
      responseBody: { error: err.message },
      durationMs,
      success: false,
      source: 'live'
    });
    return { services: [], quotes: {}, fromLive: false, error: err.message };
  }
}
