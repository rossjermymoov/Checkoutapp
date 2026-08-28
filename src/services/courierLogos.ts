import { ApiCredentials } from '../types/settings';
import { normaliseCourier } from './serviceCatalogue';

/**
 * Courier branding, sourced from the merchant's own Voila account via
 * GET /api/couriers/v1/list-couriers. Voila hosts the artwork, so nothing is
 * scraped or bundled — the logos come from the same place as the services.
 */

export interface CourierBrand {
  key: string;
  name: string;
  logo: string;
  thumbnail: string;
}

const LOGO_BASE = 'https://app.heyvoila.io/courier-service-logos';

/**
 * Corrections to what list-couriers reports.
 *
 * Voila's own data has every Yodel variant — Yodel, YodelC2C, YodelECR,
 * YodelLink, YodelReturns — pointing at InPost.png. Verified: the two URLs
 * return byte-identical files (md5 6a30c620…). Showing InPost's branding
 * against a Yodel delivery is a customer-facing error, so it is corrected here.
 * yodel.jpg exists on the same server and is the real Yodel wordmark.
 *
 * InPost's own entry is fine; it is the file INITIAL_COURIERS referenced in
 * lowercase (inpost.jpg) that 404s.
 */
const LOGO_CORRECTIONS: Record<string, string> = {
  yodel: `${LOGO_BASE}/yodel.jpg`,
  inpost: `${LOGO_BASE}/InPost.png`,
};

/** Used when the account has not been reached yet. Verified to return 200. */
const FALLBACK_LOGOS: Record<string, string> = {
  dpd: `${LOGO_BASE}/dpd.jpg`,
  ups: `${LOGO_BASE}/ups.jpg`,
  yodel: `${LOGO_BASE}/yodel.jpg`,
  evri: `${LOGO_BASE}/evri.jpg`,
  inpost: `${LOGO_BASE}/InPost.png`,
  dhl: `${LOGO_BASE}/dhl.jpg`,
  royalmail: `${LOGO_BASE}/royalmail.jpg`,
};

let cache: Map<string, CourierBrand> | null = null;
let inflight: Promise<Map<string, CourierBrand>> | null = null;

function applyCorrection(key: string, url: string): string {
  const corrected = LOGO_CORRECTIONS[normaliseCourier(key).toLowerCase()];
  return corrected || url;
}

export function clearCourierBrandCache() {
  cache = null;
  inflight = null;
}

export async function getCourierBrands(credentials: ApiCredentials): Promise<Map<string, CourierBrand>> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const brands = new Map<string, CourierBrand>();
    try {
      const res = await fetch('/api/proxy/list-couriers', {
        headers: {
          'api-user': credentials.voilaApiUser || '',
          'api-token': credentials.voilaApiToken || '',
        },
      });
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data?.couriers || [];

      list.forEach((c) => {
        if (!c || !c.key) return;
        const canonical = normaliseCourier(c.key).toLowerCase();
        const brand: CourierBrand = {
          key: c.key,
          name: c.name || c.key,
          logo: applyCorrection(c.key, c.logo || ''),
          thumbnail: applyCorrection(c.key, c.thumbnail || c.logo || ''),
        };
        // Several variants normalise to the same canonical courier (Yodel,
        // YodelC2C, YodelECR…). First one wins; they share artwork anyway.
        if (!brands.has(canonical)) brands.set(canonical, brand);
      });
    } catch (e) {
      // Fall through to the built-in list rather than rendering nothing.
    }

    Object.entries(FALLBACK_LOGOS).forEach(([key, logo]) => {
      if (!brands.has(key)) {
        brands.set(key, { key, name: key.toUpperCase(), logo, thumbnail: logo });
      }
    });

    cache = brands;
    inflight = null;
    return brands;
  })();

  return inflight;
}

/** Synchronous best-effort lookup for components that already hold the map. */
export function findBrand(brands: Map<string, CourierBrand> | null, courier?: string): CourierBrand | null {
  if (!brands || !courier) return null;
  return brands.get(normaliseCourier(courier).toLowerCase()) || null;
}
