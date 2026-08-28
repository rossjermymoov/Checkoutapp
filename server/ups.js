/**
 * UPS live negotiated rates.
 *
 * Implements the flow in UPS_Negotiated_Rates_Technical_Reference.md: OAuth
 * client-credentials for a cached token, then Shoptimeintransit for every
 * available service with business-days transit, reading the negotiated total
 * where UPS returns one.
 *
 * Server-side only, deliberately. The OAuth secret and the account number never
 * reach a browser, and UPS_MARKUP_PCT lets the negotiated cost be marked up here
 * so a customer-facing page receives a sell price rather than the contracted
 * buy price.
 */

const SERVICE_NAMES = {
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '12': 'UPS 3 Day Select',
  '54': 'UPS Worldwide Express Plus',
  '65': 'UPS Worldwide Saver',
  '96': 'UPS Worldwide Express Freight',
};

const FUEL_CODE = '375';
const REMOTE_AREA_CODES = new Set(['190', '195', '197', '199', '400', '401']);

const ACCESSORIAL_NAMES = {
  '375': 'Fuel surcharge',
  '270': 'Residential surcharge',
  '100': 'Additional handling',
  '110': 'Large package surcharge',
  '120': 'Over-maximum-limits',
  '190': 'Delivery area surcharge',
  '195': 'Extended area surcharge',
  '197': 'Remote area surcharge',
  '199': 'Remote area surcharge',
  '400': 'Remote area surcharge',
  '401': 'Extended area surcharge',
  '260': 'Signature required',
};

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function upsConfig() {
  const env = (process.env.UPS_ENV || 'test').toLowerCase();
  return {
    clientId: process.env.UPS_CLIENT_ID || '',
    clientSecret: process.env.UPS_CLIENT_SECRET || '',
    accountNumber: process.env.UPS_ACCOUNT_NUMBER || '',
    env,
    // CIE returns SAMPLE pricing. Real negotiated rates need production.
    baseUrl: env === 'production' ? 'https://onlinetools.ups.com' : 'https://wwwcie.ups.com',
    version: process.env.UPS_RATING_VERSION || 'v2403',
    markupPct: num(process.env.UPS_MARKUP_PCT) || 0,
    shipper: {
      name: process.env.UPS_SHIPPER_NAME || 'MOOV Parcel',
      addressLine: process.env.UPS_SHIPPER_ADDRESS || '1 Mellor Meadows',
      city: process.env.UPS_SHIPPER_CITY || 'Whittington',
      postalCode: process.env.UPS_SHIPPER_POSTCODE || 'SY11 4FN',
      countryCode: process.env.UPS_SHIPPER_COUNTRY || 'GB',
    },
  };
}

export function upsConfigured() {
  const c = upsConfig();
  return Boolean(c.clientId && c.clientSecret && c.accountNumber);
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

let tokenCache = { token: null, expiresAt: 0 };

export function clearUpsTokenCache() {
  tokenCache = { token: null, expiresAt: 0 };
}

async function getAccessToken() {
  const c = upsConfig();
  // Reuse until a minute before expiry, per the reference.
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64');
  const res = await fetch(`${c.baseUrl}/security/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
      'x-merchant-id': c.accountNumber,
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`UPS OAuth failed (HTTP ${res.status}): ${text.substring(0, 300)}`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new Error(`UPS OAuth returned non-JSON: ${text.substring(0, 300)}`);
  }

  const expiresIn = num(body.expires_in) || 3600;
  tokenCache = { token: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return tokenCache.token;
}

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------

/** One decimal, minimum 0.1 — international time-in-transit rejects anything else. */
function formatWeight(kg) {
  const n = Math.max(0.1, Number(kg) || 0.1);
  return n.toFixed(1);
}

/**
 * UPS rates each physical piece, so a quantity of four becomes four Package
 * entries rather than one entry weighing four times as much.
 */
export function buildRateRequest({ shipTo, parcels, orderValue, currency = 'GBP' }, config = upsConfig()) {
  const expanded = [];
  parcels.forEach((p) => {
    const quantity = Math.max(1, Math.floor(Number(p.quantity) || 1));
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        PackagingType: { Code: p.packagingType || '02' },
        PackageWeight: {
          UnitOfMeasurement: { Code: 'KGS', Description: 'Kilograms' },
          Weight: formatWeight(p.weightKg),
        },
        Dimensions: {
          UnitOfMeasurement: { Code: 'CM', Description: 'Centimeters' },
          Length: String(p.lengthCm ?? 30),
          Width: String(p.widthCm ?? 20),
          Height: String(p.heightCm ?? 15),
        },
      });
    }
  });

  const totalWeight = expanded.reduce((sum, p) => sum + Number(p.PackageWeight.Weight), 0);

  return {
    RateRequest: {
      Request: {
        SubVersion: config.version.replace(/^v/, ''),
        TransactionReference: { CustomerContext: 'quote' },
      },
      Shipment: {
        Shipper: {
          Name: config.shipper.name,
          // Required for negotiated rates — without it UPS returns published only.
          ShipperNumber: config.accountNumber,
          Address: {
            AddressLine: [config.shipper.addressLine],
            City: config.shipper.city,
            PostalCode: config.shipper.postalCode,
            CountryCode: config.shipper.countryCode,
          },
        },
        ShipFrom: {
          Name: config.shipper.name,
          Address: {
            AddressLine: [config.shipper.addressLine],
            City: config.shipper.city,
            PostalCode: config.shipper.postalCode,
            CountryCode: config.shipper.countryCode,
          },
        },
        ShipTo: {
          Name: shipTo.name || 'Receiver',
          Address: {
            AddressLine: [shipTo.address1 || ''],
            City: shipTo.city || '',
            // The destination postcode is what unlocks accurate remote-area surcharges.
            PostalCode: shipTo.postcode || '',
            CountryCode: (shipTo.countryIso || 'GB').toUpperCase(),
          },
        },
        ShipmentRatingOptions: { NegotiatedRatesIndicator: 'Y' },
        // 03 = non-document, required for time in transit.
        DeliveryTimeInformation: { PackageBillType: '03' },
        // International lanes must declare a contents value (error 111549).
        InvoiceLineTotal: {
          CurrencyCode: currency,
          MonetaryValue: String(Math.max(1, Math.round(Number(orderValue) || 1))),
        },
        ShipmentTotalWeight: {
          UnitOfMeasurement: { Code: 'KGS', Description: 'Kilograms' },
          Weight: formatWeight(totalWeight),
        },
        NumOfPieces: String(expanded.length),
        Package: expanded,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Turn a RateResponse into one entry per service.
 *
 * Negotiated figures are preferred throughout: the negotiated total is the real
 * cost, and where UPS itemises the negotiated charges those lines are the real
 * discounted surcharges. Only when negotiated itemisation is absent is a line
 * approximated by scaling the published one.
 */
export function parseRateResponse(body, { markupPct = 0 } = {}) {
  const response = body?.RateResponse;
  const rated = asArray(response?.RatedShipment);

  const alerts = asArray(response?.Response?.Alert).map((a) => ({
    code: String(a?.Code ?? ''),
    description: a?.Description ?? '',
  }));

  const services = rated
    .map((rs) => {
      const code = String(rs?.Service?.Code ?? '');
      const negotiated = rs?.NegotiatedRateCharges;

      const negotiatedTotal = num(negotiated?.TotalCharge?.MonetaryValue);
      const publishedTotal = num(rs?.TotalCharges?.MonetaryValue);
      const cost = negotiatedTotal ?? publishedTotal;
      if (cost == null) return null;

      const days =
        num(rs?.GuaranteedDelivery?.BusinessDaysInTransit) ??
        num(rs?.TimeInTransit?.ServiceSummary?.EstimatedArrival?.BusinessDaysInTransit);

      // Prefer the negotiated itemisation; it carries the true discounted lines.
      const hasNegotiatedItems = Boolean(negotiated?.ItemizedCharges);
      const source = hasNegotiatedItems ? negotiated : rs;
      const scale =
        !hasNegotiatedItems && negotiatedTotal != null && publishedTotal
          ? negotiatedTotal / publishedTotal
          : 1;

      let fuel = 0;
      const accessorials = [];
      asArray(source?.ItemizedCharges).forEach((item) => {
        const itemCode = String(item?.Code ?? '');
        const amount = (num(item?.MonetaryValue) || 0) * scale;
        if (itemCode === FUEL_CODE) {
          fuel += amount;
        } else if (amount > 0) {
          accessorials.push({
            code: itemCode,
            // An unknown code keeps its value and gets a label — never dropped.
            name: ACCESSORIAL_NAMES[itemCode] || `Accessorial ${itemCode}`,
            amount: Number(amount.toFixed(2)),
            remoteArea: REMOTE_AREA_CODES.has(itemCode),
          });
        }
      });

      const baseCharge = (num(source?.BaseServiceCharge?.MonetaryValue) || 0) * scale;
      const currency =
        negotiated?.TotalCharge?.CurrencyCode || rs?.TotalCharges?.CurrencyCode || 'GBP';

      const sell = Number((cost * (1 + markupPct / 100)).toFixed(2));

      return {
        serviceCode: code,
        serviceName: SERVICE_NAMES[code] || `UPS service ${code}`,
        currency,
        // `price` is what the app sells at; `cost` is retained for the server log
        // and stripped before the response leaves when a markup is applied.
        price: sell,
        cost: Number(cost.toFixed(2)),
        negotiated: negotiatedTotal != null,
        negotiatedItemised: hasNegotiatedItems,
        daysInTransit: days,
        breakdown: {
          base: Number(baseCharge.toFixed(2)),
          fuel: Number(fuel.toFixed(2)),
          accessorials,
          remoteArea: accessorials.some((a) => a.remoteArea),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.price - b.price);

  return { services, alerts };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function getUpsRates({ shipTo, parcels, orderValue }) {
  const config = upsConfig();
  if (!upsConfigured()) {
    const missing = [
      !config.clientId && 'UPS_CLIENT_ID',
      !config.clientSecret && 'UPS_CLIENT_SECRET',
      !config.accountNumber && 'UPS_ACCOUNT_NUMBER',
    ].filter(Boolean);
    const error = new Error(`UPS is not configured. Missing: ${missing.join(', ')}`);
    error.status = 400;
    error.missing = missing;
    throw error;
  }

  const token = await getAccessToken();
  const request = buildRateRequest({ shipTo, parcels, orderValue }, config);

  const res = await fetch(`${config.baseUrl}/api/rating/${config.version}/Shoptimeintransit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      transId: `checkout${Date.now()}`,
      transactionSrc: 'checkout-demo',
    },
    body: JSON.stringify(request),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    const error = new Error(`UPS returned non-JSON (HTTP ${res.status}): ${text.substring(0, 300)}`);
    error.status = 502;
    throw error;
  }

  if (!res.ok) {
    const detail =
      asArray(body?.response?.errors)
        .map((e) => `${e.code} ${e.message}`)
        .join('; ') || text.substring(0, 300);
    const error = new Error(`UPS rating failed (HTTP ${res.status}): ${detail}`);
    error.status = res.status;
    throw error;
  }

  const parsed = parseRateResponse(body, { markupPct: config.markupPct });

  // The charge breakdown is parsed because UPS itemises discounts there and it
  // is useful in the server log, but it never leaves this process. A shopper is
  // buying a delivery service at a price, not reading a carrier invoice — and
  // fuel, remote-area surcharges and the negotiated cost behind them are
  // commercially yours, not theirs.
  parsed.services.forEach((s) => {
    console.log(
      `[UPS] ${s.serviceCode} ${s.serviceName}: cost ${s.currency} ${s.cost}` +
        `${config.markupPct ? ` -> sell ${s.price}` : ''}` +
        ` (base ${s.breakdown.base}, fuel ${s.breakdown.fuel}` +
        `${s.breakdown.accessorials.length ? `, ${s.breakdown.accessorials.length} accessorial(s)` : ''}` +
        `${s.breakdown.remoteArea ? ', REMOTE AREA' : ''})` +
        `${s.negotiated ? '' : ' [published rate — negotiated not returned]'}`
    );
  });

  return {
    services: parsed.services.map(toClientService),
    alerts: parsed.alerts,
    environment: config.env,
  };
}

/**
 * What a browser is allowed to see: the service, its total, and how long it
 * takes. No cost, no markup, no itemisation.
 */
export function toClientService(service) {
  return {
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
    currency: service.currency,
    price: service.price,
    daysInTransit: service.daysInTransit,
  };
}

export const __testing = { SERVICE_NAMES, REMOTE_AREA_CODES, formatWeight };
