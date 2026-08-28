import { PricingRule, PricingAction, PricingRuleConditions } from '../types/settings';
import { normaliseCourier } from './serviceCatalogue';

/**
 * Pricing rule engine.
 *
 * Rules form an ordered pipeline. The carrier's quoted price enters the first
 * rule; each rule whose conditions match transforms the running price and hands
 * it to the next. With no rules the quote passes through untouched.
 *
 * Order matters, and is the merchant's to control: "add £10 for international"
 * followed by "round up to the nearest 25p" gives a different answer from the
 * reverse. Rounding rules almost always belong last.
 *
 * All arithmetic is done in integer pence. Working in pounds as floats breaks
 * rounding in ways that are easy to miss: 7.25 / 0.25 evaluates to
 * 29.000000000000004, so Math.ceil pushes an already-round £7.25 up to £7.50.
 */

export interface PricingContext {
  courier: string;
  serviceId: string;
  /** ISO-2 destination country, e.g. "GB", "FR". */
  countryIso: string;
  /** Cart subtotal, for order-value conditions. */
  orderValue: number;
  weightKg: number;
  isDropShop: boolean;
  /** Country treated as domestic. Defaults to GB. */
  originCountry?: string;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  from: number;
  to: number;
  description: string;
}

export interface PricingResult {
  price: number;
  applied: AppliedRule[];
}

const toPence = (pounds: number): number => Math.round(pounds * 100);
const toPounds = (pence: number): number => Math.round(pence) / 100;

export function isInternational(ctx: PricingContext): boolean {
  const origin = (ctx.originCountry || 'GB').toUpperCase();
  const dest = (ctx.countryIso || origin).toUpperCase();
  return dest !== origin;
}

function inRange(value: number, min: number | null, max: number | null): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function conditionsMatch(
  conditions: PricingRuleConditions,
  pricePounds: number,
  ctx: PricingContext
): boolean {
  const c = conditions;

  if (c.couriers.length > 0) {
    const courier = normaliseCourier(ctx.courier).toLowerCase();
    if (!c.couriers.some((x) => normaliseCourier(x).toLowerCase() === courier)) return false;
  }

  if (c.serviceIds.length > 0 && !c.serviceIds.includes(ctx.serviceId)) return false;

  if (c.destination === 'domestic' && isInternational(ctx)) return false;
  if (c.destination === 'international' && !isInternational(ctx)) return false;

  if (c.countries.length > 0) {
    const dest = (ctx.countryIso || '').toUpperCase();
    if (!c.countries.some((x) => x.toUpperCase() === dest)) return false;
  }

  if (c.dropShopOnly !== null && c.dropShopOnly !== ctx.isDropShop) return false;

  if (!inRange(ctx.orderValue, c.minOrderValue, c.maxOrderValue)) return false;
  if (!inRange(ctx.weightKg, c.minWeightKg, c.maxWeightKg)) return false;
  if (!inRange(pricePounds, c.minPrice, c.maxPrice)) return false;

  return true;
}

/** Apply one action to a price. Returns pounds, rounded to whole pence. */
export function applyAction(pricePounds: number, action: PricingAction): number {
  const pence = toPence(pricePounds);

  switch (action.type) {
    case 'passthrough':
      return toPounds(pence);

    case 'add_fixed':
      return toPounds(pence + toPence(action.amount));

    case 'add_percentage':
      return toPounds(Math.round(pence * (1 + action.percent / 100)));

    case 'set_price':
      return toPounds(toPence(action.amount));

    case 'round_up_to': {
      const inc = toPence(action.increment);
      if (inc <= 0) return toPounds(pence);
      return toPounds(Math.ceil(pence / inc) * inc);
    }

    case 'round_nearest': {
      const inc = toPence(action.increment);
      if (inc <= 0) return toPounds(pence);
      return toPounds(Math.round(pence / inc) * inc);
    }

    case 'minimum_price':
      return toPounds(Math.max(pence, toPence(action.amount)));

    case 'maximum_price':
      return toPounds(Math.min(pence, toPence(action.amount)));

    case 'free':
      return 0;

    default:
      return toPounds(pence);
  }
}

export function describeAction(action: PricingAction): string {
  switch (action.type) {
    case 'passthrough':
      return 'Pass through unchanged';
    case 'add_fixed':
      return `Add £${action.amount.toFixed(2)}`;
    case 'add_percentage':
      return `Add ${action.percent}%`;
    case 'set_price':
      return `Set price to £${action.amount.toFixed(2)}`;
    case 'round_up_to':
      return `Round up to nearest £${action.increment.toFixed(2)}`;
    case 'round_nearest':
      return `Round to nearest £${action.increment.toFixed(2)}`;
    case 'minimum_price':
      return `Never below £${action.amount.toFixed(2)}`;
    case 'maximum_price':
      return `Never above £${action.amount.toFixed(2)}`;
    case 'free':
      return 'Free delivery';
    default:
      return 'Unknown action';
  }
}

export function describeConditions(c: PricingRuleConditions): string {
  const parts: string[] = [];
  if (c.couriers.length > 0) parts.push(c.couriers.join(' or '));
  if (c.serviceIds.length > 0) parts.push(`service ${c.serviceIds.join(' or ')}`);
  if (c.destination === 'domestic') parts.push('UK only');
  if (c.destination === 'international') parts.push('international');
  if (c.countries.length > 0) parts.push(`to ${c.countries.join(', ')}`);
  if (c.dropShopOnly === true) parts.push('pickup points');
  if (c.dropShopOnly === false) parts.push('doorstep');
  if (c.minOrderValue != null) parts.push(`order ≥ £${c.minOrderValue}`);
  if (c.maxOrderValue != null) parts.push(`order ≤ £${c.maxOrderValue}`);
  if (c.minWeightKg != null) parts.push(`≥ ${c.minWeightKg}kg`);
  if (c.maxWeightKg != null) parts.push(`≤ ${c.maxWeightKg}kg`);
  if (c.minPrice != null) parts.push(`price ≥ £${c.minPrice}`);
  if (c.maxPrice != null) parts.push(`price ≤ £${c.maxPrice}`);
  return parts.length > 0 ? parts.join(', ') : 'every quote';
}

export function applyPricingRules(
  basePrice: number,
  rules: PricingRule[],
  ctx: PricingContext
): PricingResult {
  let price = toPounds(toPence(basePrice));
  const applied: AppliedRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!conditionsMatch(rule.conditions, price, ctx)) continue;

    const from = price;
    const to = applyAction(price, rule.action);

    // Record even a no-op match, so "why is this price what it is" is answerable.
    applied.push({
      ruleId: rule.id,
      ruleName: rule.name,
      from,
      to,
      description: describeAction(rule.action),
    });

    price = to;
    if (rule.stopIfMatched) break;
  }

  return { price: Math.max(0, price), applied };
}

export function emptyConditions(): PricingRuleConditions {
  return {
    couriers: [],
    serviceIds: [],
    destination: 'any',
    countries: [],
    minOrderValue: null,
    maxOrderValue: null,
    minWeightKg: null,
    maxWeightKg: null,
    minPrice: null,
    maxPrice: null,
    dropShopOnly: null,
  };
}

export function newRule(partial: Partial<PricingRule> = {}): PricingRule {
  return {
    id: `rule_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    name: 'New rule',
    enabled: true,
    conditions: emptyConditions(),
    action: { type: 'add_fixed', amount: 0 },
    stopIfMatched: false,
    ...partial,
  };
}

/** Starting points offered in the console. */
export const RULE_TEMPLATES: Array<{ label: string; description: string; build: () => PricingRule }> = [
  {
    label: 'International surcharge',
    description: 'Add a fixed amount to anything leaving the UK',
    build: () =>
      newRule({
        name: 'International surcharge',
        conditions: { ...emptyConditions(), destination: 'international' },
        action: { type: 'add_fixed', amount: 10 },
      }),
  },
  {
    label: 'Round up to 25p',
    description: 'Tidy the final figure — £7.12 becomes £7.25',
    build: () =>
      newRule({
        name: 'Round up to nearest 25p',
        action: { type: 'round_up_to', increment: 0.25 },
      }),
  },
  {
    label: 'Percentage margin',
    description: 'Add a percentage to every quote',
    build: () =>
      newRule({
        name: 'Margin',
        action: { type: 'add_percentage', percent: 15 },
      }),
  },
  {
    label: 'Courier surcharge',
    description: 'Add an amount for one courier only',
    build: () =>
      newRule({
        name: 'DPD handling',
        conditions: { ...emptyConditions(), couriers: ['DPD'] },
        action: { type: 'add_fixed', amount: 1 },
      }),
  },
  {
    label: 'Free over a threshold',
    description: 'Free delivery once the basket reaches a value',
    build: () =>
      newRule({
        name: 'Free delivery over £150',
        conditions: { ...emptyConditions(), minOrderValue: 150 },
        action: { type: 'free' },
        stopIfMatched: true,
      }),
  },
  {
    label: 'Minimum charge',
    description: 'Never sell delivery below a floor price',
    build: () =>
      newRule({
        name: 'Minimum delivery charge',
        action: { type: 'minimum_price', amount: 3.5 },
      }),
  },
];
