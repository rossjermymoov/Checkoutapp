import { ApiCredentials } from '../types/settings';
import { VoilaPreset, PickupLocationItem, ApiLogEntry } from '../types/api';
import { CustomerDetails } from '../types/checkout';
import { MOCK_PRESETS_BY_COURIER, MOCK_PICKUP_LOCATIONS, MOCK_BILLING_QUOTES } from './mockData';

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

// 1. HeyVoila API: Get Presets (GET /api/couriers/v1/:courier/presets)
export async function getCourierPresets(
  courier: string,
  credentials: ApiCredentials
): Promise<{ presets: VoilaPreset[]; fromLive: boolean; error?: string }> {
  const startTime = Date.now();
  const endpoint = `/api/proxy/presets/${encodeURIComponent(courier)}`;
  const headers: Record<string, string> = {
    'api-user': credentials.voilaApiUser,
    'api-token': credentials.voilaApiToken,
  };

  if (!credentials.useLiveApi) {
    const mockList = MOCK_PRESETS_BY_COURIER[courier] || [];
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: `https://app.heyvoila.io/api/couriers/v1/${courier}/presets`,
      method: 'GET',
      headers,
      responseStatus: 200,
      responseBody: mockList,
      durationMs: 45,
      success: true,
      source: 'mock'
    });
    return { presets: mockList, fromLive: false };
  }

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
      success: res.ok && isJson && Array.isArray(data),
      source: 'live'
    });

    if (!res.ok || !Array.isArray(data)) {
      console.warn(`[API] Live Presets failed for ${courier}, falling back to mock presets:`, data);
      return {
        presets: MOCK_PRESETS_BY_COURIER[courier] || [],
        fromLive: false,
        error: (Array.isArray(data) ? null : data?.error) || `HTTP ${res.status}: Failed to fetch presets`
      };
    }

    return { presets: data, fromLive: true };
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
    return { presets: MOCK_PRESETS_BY_COURIER[courier] || [], fromLive: false, error: err.message };
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
  };

  const body = {
    testing: true,
    auth_company: credentials.voilaAuthCompany || 'YTC',
    address: {
      name: `${customer.firstName} ${customer.lastName}`.trim() || 'Ross Jermy',
      phone: customer.phone || '07841552355',
      email: customer.email || 'ross.jermy@gmail.com',
      company_name: '',
      address_1: customer.address1 || '9 Mellor Meadows',
      address_2: customer.address2 || '',
      address_3: '',
      city: customer.city || 'Oswestry',
      county: customer.county || '',
      postcode: customer.postcode || 'SY11 4FN',
      country_iso: customer.countryIso || 'GB',
    }
  };

  if (!credentials.useLiveApi) {
    const locations = MOCK_PICKUP_LOCATIONS.filter(
      loc => !courier || loc.pickupLocation.courier?.toLowerCase() === courier.toLowerCase() || courier === 'all'
    );
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
    return { locations: locations.length > 0 ? locations : MOCK_PICKUP_LOCATIONS, fromLive: false };
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
      console.warn(`[API] Live Pickup Locations failed for ${courier}, falling back to mock:`, data);
      return {
        locations: MOCK_PICKUP_LOCATIONS,
        fromLive: false,
        error: (Array.isArray(data) ? null : data?.error) || `HTTP ${res.status}: Failed to fetch pickup locations`
      };
    }

    const locationsWithCourier: PickupLocationItem[] = data.map((item: any) => ({
      ...item,
      pickupLocation: {
        ...item.pickupLocation,
        courier: item.pickupLocation?.courier || courier
      }
    }));

    return { locations: locationsWithCourier, fromLive: true };
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
    return { locations: MOCK_PICKUP_LOCATIONS, fromLive: false, error: err.message };
  }
}

// 3. Billing API: Get Quote (https://production.billingapi.co.uk/api/customer-routes/get-quote)
export async function getBillingQuote(
  customer: CustomerDetails,
  credentials: ApiCredentials,
  totalWeightKg: number = 1.5
): Promise<{ quotes: Record<string, number>; rawResponse?: any; fromLive: boolean; error?: string }> {
  const startTime = Date.now();
  const endpoint = '/api/proxy/billing-quote';
  const headers: Record<string, string> = {
    'client_name': credentials.billingClientName || 'Moov Parcel',
    'customer_dc_id': credentials.billingCustomerDcId || 'Kitloop',
    'customer_key': credentials.billingCustomerKey || 'b62e9045a42d43468840c6e07b568fcd',
    'x-endpoint-url': credentials.billingEndpointUrl,
    'Content-Type': 'application/json',
  };

  const body = {
    auth_company: credentials.voilaAuthCompany || '',
    format_address_default: true,
    request_id: "req_" + Math.random().toString(36).substring(2, 10),
    shipment: {
      label_size: "6x4",
      label_format: "pdf",
      generate_invoice: false,
      generate_packing_slip: false,
      collection_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      reference: "checkout-quote",
      reference_2: "",
      delivery_instructions: "Leave in safe place",
      ship_from: {
        name: "Ross Jermy",
        phone: "01111111111",
        email: "ross.jermy@gmail.com",
        company_name: "Logistics Hub",
        address_1: "2 Infirmary Street",
        address_2: "",
        address_3: "",
        city: "Leeds",
        postcode: "LS1 2JP",
        county: "West Yorkshire",
        country_iso: "GB",
        company_id: "00000000",
        tax_id: "GB123456789",
        eori_id: "GB123456789000",
        ioss_number: null
      },
      ship_to: {
        name: `${customer.firstName} ${customer.lastName}`.trim() || "Ross Jermy",
        phone: customer.phone || "07841552355",
        email: customer.email || "ross.jermy@gmail.com",
        company_name: null,
        address_1: customer.address1 || "9 Mellor Meadows",
        address_2: customer.address2 || "Whittington",
        address_3: "",
        city: customer.city || "Oswestry",
        county: customer.county || "Shropshire",
        postcode: customer.postcode || "SY11 4FN",
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

  if (!credentials.useLiveApi) {
    emitLog({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      endpoint: credentials.billingEndpointUrl || 'https://production.billingapi.co.uk/api/customer-routes/get-quote',
      method: 'POST',
      headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: MOCK_BILLING_QUOTES,
      durationMs: 95,
      success: true,
      source: 'mock'
    });
    return { quotes: MOCK_BILLING_QUOTES, fromLive: false };
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
      console.warn('[API] Live Quote failed, falling back to mock quotes:', data);
      return {
        quotes: MOCK_BILLING_QUOTES,
        fromLive: false,
        error: data?.error || `HTTP ${res.status}: Quote endpoint error`
      };
    }

    const priceMap: Record<string, number> = {};
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const code = item.service_code || item.dc_service_id || item.service_name;
        const total = item.price?.total ?? item.total ?? item.price;
        if (code && typeof total === 'number') {
          priceMap[code] = total;
        }
      });
    } else if (data && typeof data === 'object') {
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'number') {
          priceMap[k] = data[k];
        }
      });
    }

    return {
      quotes: Object.keys(priceMap).length > 0 ? priceMap : MOCK_BILLING_QUOTES,
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
    return { quotes: MOCK_BILLING_QUOTES, fromLive: false, error: err.message };
  }
}
