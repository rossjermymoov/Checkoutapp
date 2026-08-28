import { VoilaPreset } from '../types/api';
import { ApiCredentials } from '../types/settings';
import { getCourierPresets } from './api';

/**
 * The service catalogue joins the two upstream sources:
 *
 *   Billing API  -> WHAT is sellable to this postcode, and at what price.
 *                   It already applies each service's postcode restrictions and
 *                   zone pricing, so its response is the authority on availability.
 *   Voila presets -> metadata about each service: transit time, display name,
 *                    weight/dimension rules, postcode rules.
 *
 * The join key is dc_service_id (Voila) === service_code (Billing).
 */

export interface LeadTime {
  /** Working days in transit. null when the courier does not publish one. */
  days: number | null;
  /** Customer-facing label, e.g. "Next working day". Empty when unknown. */
  label: string;
}

export interface ServiceMeta {
  dcServiceId: string;
  name: string;
  courier: string;
  leadTime: LeadTime;
  includePostcodes: string[];
  excludePostcodes: string[];
  supportedCountries: string[];
  weightMaxKg: number | null;
  weightMinKg: number | null;
}

// Voila publishes transit times as these fixed strings.
const LEAD_TIMES: Record<string, LeadTime> = {
  'Same Day': { days: 0, label: 'Same day' },
  'Next Day': { days: 1, label: 'Next working day' },
  'Two Day': { days: 2, label: '2 working days' },
  'Three Day': { days: 3, label: '3 working days' },
  'Three Day Plus': { days: 4, label: '3+ working days' },
};

export function parseLeadTime(raw: string | null | undefined): LeadTime {
  if (!raw) return { days: null, label: '' };
  return LEAD_TIMES[raw] || { days: null, label: raw };
}

/** Canonical courier key, used for logos and for matching console courier toggles. */
export function normaliseCourier(raw: string | null | undefined): string {
  const c = (raw || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!c) return 'Unknown';
  if (c.includes('dpd')) return 'DPD';
  if (c.includes('ups')) return 'UPS';
  if (c.includes('yodel')) return 'Yodel';
  if (c.includes('dhl')) return 'DHL';
  if (c.includes('royalmail')) return 'RoyalMail';
  if (c.includes('evri') || c.includes('hermes')) return 'Evri';
  if (c.includes('inpost')) return 'InPost';
  if (c.includes('citysprint')) return 'CitySprint';
  if (c.includes('skynet')) return 'SkyNet';
  if (c.includes('agl')) return 'AGL';
  return raw as string;
}

function splitRule(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

const OUTWARD_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?$/;

/**
 * Outward code of a UK postcode: "B66 1BY" -> "B66", "SW1A 1AA" -> "SW1A".
 * Returns '' if the postcode is not recognisably UK.
 *
 * The inward code is always exactly three characters, so the outward code is
 * everything before them. Do NOT pattern-match the front of a space-stripped
 * postcode instead: "IV1 1AA" becomes "IV11AA", and a greedy match yields
 * "IV11" — a different, real postcode district. That silently applies the
 * wrong courier restrictions.
 */
export function outwardCode(postcode: string): string {
  const clean = (postcode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';

  if (clean.length > 3) {
    const candidate = clean.slice(0, -3);
    if (OUTWARD_PATTERN.test(candidate)) return candidate;
  }

  // Partial entry — the customer has typed only the outward half so far.
  return OUTWARD_PATTERN.test(clean) ? clean : '';
}

/** Postcode area: the leading letters. "B66" -> "B", "IV12" -> "IV". */
export function postcodeArea(postcode: string): string {
  const outward = outwardCode(postcode);
  const match = outward.match(/^[A-Z]{1,2}/);
  return match ? match[0] : '';
}

/**
 * Voila's postcode rules mix whole areas ("BT" = all of Northern Ireland) with
 * individual districts ("IV1", "FK17"). A district rule must NOT match a
 * different district that merely starts with the same characters — IV1 must not
 * catch IV12 — so districts are compared exactly and areas by their letters.
 */
function postcodeMatchesRule(postcode: string, rules: string[]): boolean {
  if (rules.length === 0) return false;
  const outward = outwardCode(postcode);
  const area = postcodeArea(postcode);
  if (!outward) return false;
  return rules.some((rule) => rule === outward || (rule === area && /^[A-Z]{1,2}$/.test(rule)));
}

export interface EligibilityResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Whether a service may carry to this postcode, per its own preset rules.
 *
 * The Billing API already enforces this upstream, so a service that fails here
 * will normally be absent from the quote anyway. This exists to EXPLAIN an
 * absence to the merchant, and to filter drop-shop couriers, which are chosen
 * independently of the quote.
 */
export function checkPostcodeEligibility(meta: ServiceMeta, postcode: string): EligibilityResult {
  const outward = outwardCode(postcode);
  if (!outward) return { allowed: true };

  if (meta.includePostcodes.length > 0 && !postcodeMatchesRule(postcode, meta.includePostcodes)) {
    return { allowed: false, reason: `${meta.name} only covers ${meta.includePostcodes.slice(0, 3).join(', ')}` };
  }
  if (postcodeMatchesRule(postcode, meta.excludePostcodes)) {
    return { allowed: false, reason: `${meta.name} does not deliver to ${outward}` };
  }
  return { allowed: true };
}

export function checkWeightEligibility(meta: ServiceMeta, weightKg: number): EligibilityResult {
  if (meta.weightMaxKg != null && weightKg > meta.weightMaxKg) {
    return { allowed: false, reason: `${meta.name} has a ${meta.weightMaxKg}kg limit` };
  }
  if (meta.weightMinKg != null && weightKg < meta.weightMinKg) {
    return { allowed: false, reason: `${meta.name} has a ${meta.weightMinKg}kg minimum` };
  }
  return { allowed: true };
}

function toServiceMeta(preset: VoilaPreset): ServiceMeta {
  // The nested `json` string carries the real courier; the top-level `courier`
  // field is the Voila account name (e.g. "MoovParcel") and is not useful here.
  let innerCourier = '';
  try {
    if (preset.json) innerCourier = JSON.parse(preset.json).courier || '';
  } catch (e) {
    /* malformed preset json — fall back to the top-level field */
  }

  const p = preset as any;
  return {
    dcServiceId: preset.dc_service_id,
    name: preset.name || preset.dc_service_id,
    courier: normaliseCourier(innerCourier || preset.courier),
    leadTime: parseLeadTime(preset.lead_time),
    includePostcodes: splitRule(p.rule_include_postcodes),
    excludePostcodes: splitRule(p.rule_exclude_postcodes),
    supportedCountries: splitRule(preset.rule_supported_countries),
    weightMaxKg: typeof p.rule_weight_max === 'number' ? p.rule_weight_max : null,
    weightMinKg: typeof p.rule_weight_min === 'number' ? p.rule_weight_min : null,
  };
}

export type ServiceCatalogue = Map<string, ServiceMeta>;

/** Index a preset list by dc_service_id. Exported so it can be tested directly. */
export function buildCatalogue(presets: VoilaPreset[]): ServiceCatalogue {
  const catalogue: ServiceCatalogue = new Map();
  presets.forEach((preset) => {
    if (preset && preset.dc_service_id) {
      catalogue.set(preset.dc_service_id, toServiceMeta(preset));
    }
  });
  return catalogue;
}

// Presets change rarely; a cart recalculation should not refetch 130 of them.
let cache: { catalogue: ServiceCatalogue; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export function clearCatalogueCache() {
  cache = null;
}

/**
 * Fetch every service Voila publishes for the account and index it by
 * dc_service_id. Returns an empty catalogue on failure — callers degrade to
 * whatever the Billing API told them rather than blocking checkout.
 */
export async function getServiceCatalogue(
  credentials: ApiCredentials,
  options: { force?: boolean } = {}
): Promise<{ catalogue: ServiceCatalogue; fromLive: boolean; error?: string }> {
  if (!options.force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { catalogue: cache.catalogue, fromLive: true };
  }

  const { presets, fromLive, error } = await getCourierPresets('MoovParcel', credentials);

  const catalogue = buildCatalogue(presets);

  if (fromLive && catalogue.size > 0) {
    cache = { catalogue, fetchedAt: Date.now() };
  }

  return { catalogue, fromLive, error };
}
