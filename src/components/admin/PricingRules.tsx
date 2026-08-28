import React, { useState, useEffect, useMemo } from 'react';
import { PoundSterling, Plus, Trash2, ChevronUp, ChevronDown, ArrowRight, Info } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { PricingRule, PricingAction, PricingActionType, RuleDestination } from '../../types/settings';
import {
  applyPricingRules,
  describeAction,
  describeConditions,
  newRule,
  RULE_TEMPLATES,
  PricingContext,
} from '../../services/pricingRules';

const ACTION_LABELS: Record<PricingActionType, string> = {
  passthrough: 'Pass through unchanged',
  add_fixed: 'Add a fixed amount (£)',
  add_percentage: 'Add a percentage (%)',
  set_price: 'Set a fixed price (£)',
  round_up_to: 'Round up to nearest',
  round_nearest: 'Round to nearest',
  minimum_price: 'Never below (£)',
  maximum_price: 'Never above (£)',
  free: 'Free delivery',
};

function defaultActionFor(type: PricingActionType): PricingAction {
  switch (type) {
    case 'add_fixed':
      return { type, amount: 10 };
    case 'add_percentage':
      return { type, percent: 15 };
    case 'set_price':
      return { type, amount: 4.99 };
    case 'round_up_to':
      return { type, increment: 0.25 };
    case 'round_nearest':
      return { type, increment: 0.05 };
    case 'minimum_price':
      return { type, amount: 3.5 };
    case 'maximum_price':
      return { type, amount: 25 };
    default:
      return { type } as PricingAction;
  }
}

const inputClass =
  'px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500';

const numberOrNull = (v: string): number | null => (v === '' ? null : parseFloat(v));

export const PricingRules: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [openRule, setOpenRule] = useState<string | null>(null);

  const [samplePrice, setSamplePrice] = useState(7.12);
  const [sampleCourier, setSampleCourier] = useState('DPD');
  const [sampleCountry, setSampleCountry] = useState('GB');
  const [sampleOrderValue, setSampleOrderValue] = useState(143);

  useEffect(() => settings.subscribe(() => setTick((t) => t + 1)), [settings]);

  const rules = settings.pricingRules;

  const courierOptions = useMemo(
    () => Array.from(new Set(settings.services.map((s) => s.courier))).filter(Boolean).sort(),
    [settings.services]
  );

  const preview = useMemo(() => {
    const ctx: PricingContext = {
      courier: sampleCourier,
      serviceId: '',
      countryIso: sampleCountry,
      orderValue: sampleOrderValue,
      weightKg: 1.5,
      isDropShop: false,
    };
    return applyPricingRules(samplePrice, rules, ctx);
  }, [samplePrice, sampleCourier, sampleCountry, sampleOrderValue, rules]);

  const update = (id: string, patch: Partial<PricingRule>) => settings.updatePricingRule(id, patch);
  const updateConditions = (rule: PricingRule, patch: Partial<PricingRule['conditions']>) =>
    update(rule.id, { conditions: { ...rule.conditions, ...patch } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <PoundSterling className="w-4 h-4 text-emerald-600" />
            Pricing Rules
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            The carrier's quote enters the first rule and each matching rule transforms it. With no rules, quotes pass
            straight through. Order matters — rounding usually belongs last.
          </p>
        </div>
        <button
          onClick={() => {
            const r = newRule();
            settings.addPricingRule(r);
            setOpenRule(r.id);
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 px-3 py-2 rounded-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add rule</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {RULE_TEMPLATES.map((t) => (
          <button
            key={t.label}
            title={t.description}
            onClick={() => {
              const r = t.build();
              settings.addPricingRule(r);
              setOpenRule(r.id);
            }}
            className="text-[11px] px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-sky-300 transition-all"
          >
            + {t.label}
          </button>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 text-gray-400 mt-0.5" />
          <span>
            No rules — carrier quotes pass straight through to the customer. Add one above, or start from a template.
          </span>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule, idx) => {
          const isOpen = openRule === rule.id;
          return (
            <div
              key={rule.id}
              className={`border rounded-xl bg-white transition-all ${
                rule.enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="p-3 flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-400 w-5 text-center">{idx + 1}</span>

                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => update(rule.id, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                />

                <button onClick={() => setOpenRule(isOpen ? null : rule.id)} className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{rule.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    <span className="text-sky-700">{describeConditions(rule.conditions)}</span>
                    <ArrowRight className="w-3 h-3 inline mx-1 text-gray-400" />
                    <span className="text-emerald-700 font-medium">{describeAction(rule.action)}</span>
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => settings.movePricingRule(rule.id, -1)}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => settings.movePricingRule(rule.id, 1)}
                    disabled={idx === rules.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => settings.deletePricingRule(rule.id)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="block text-[11px] font-semibold text-gray-700">Rule name</span>
                      <input
                        value={rule.name}
                        onChange={(e) => update(rule.id, { name: e.target.value })}
                        className={`${inputClass} w-full`}
                      />
                    </label>

                    <div className="space-y-1">
                      <span className="block text-[11px] font-semibold text-gray-700">Then</span>
                      <div className="flex gap-2">
                        <select
                          value={rule.action.type}
                          onChange={(e) =>
                            update(rule.id, { action: defaultActionFor(e.target.value as PricingActionType) })
                          }
                          className={`${inputClass} flex-1`}
                        >
                          {(Object.keys(ACTION_LABELS) as PricingActionType[]).map((t) => (
                            <option key={t} value={t}>
                              {ACTION_LABELS[t]}
                            </option>
                          ))}
                        </select>

                        {'amount' in rule.action && (
                          <input
                            type="number"
                            step="0.01"
                            value={rule.action.amount}
                            onChange={(e) =>
                              update(rule.id, {
                                action: { ...rule.action, amount: parseFloat(e.target.value) || 0 } as PricingAction,
                              })
                            }
                            className={`${inputClass} w-24`}
                          />
                        )}
                        {'percent' in rule.action && (
                          <input
                            type="number"
                            step="0.1"
                            value={rule.action.percent}
                            onChange={(e) =>
                              update(rule.id, {
                                action: { ...rule.action, percent: parseFloat(e.target.value) || 0 } as PricingAction,
                              })
                            }
                            className={`${inputClass} w-24`}
                          />
                        )}
                        {'increment' in rule.action && (
                          <select
                            value={rule.action.increment}
                            onChange={(e) =>
                              update(rule.id, {
                                action: { ...rule.action, increment: parseFloat(e.target.value) } as PricingAction,
                              })
                            }
                            className={`${inputClass} w-24`}
                          >
                            <option value={0.05}>5p</option>
                            <option value={0.1}>10p</option>
                            <option value={0.25}>25p</option>
                            <option value={0.5}>50p</option>
                            <option value={1}>£1.00</option>
                            <option value={5}>£5.00</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold text-gray-700">Apply when…</span>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <label className="space-y-1">
                        <span className="block text-[10px] text-gray-500">Destination</span>
                        <select
                          value={rule.conditions.destination}
                          onChange={(e) => updateConditions(rule, { destination: e.target.value as RuleDestination })}
                          className={`${inputClass} w-full`}
                        >
                          <option value="any">Anywhere</option>
                          <option value="domestic">UK only</option>
                          <option value="international">International only</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="block text-[10px] text-gray-500">Countries (ISO, comma separated)</span>
                        <input
                          value={rule.conditions.countries.join(', ')}
                          onChange={(e) =>
                            updateConditions(rule, {
                              countries: e.target.value
                                .split(',')
                                .map((x) => x.trim().toUpperCase())
                                .filter(Boolean),
                            })
                          }
                          placeholder="e.g. FR, DE, IE"
                          className={`${inputClass} w-full`}
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="block text-[10px] text-gray-500">Delivery type</span>
                        <select
                          value={rule.conditions.dropShopOnly === null ? 'any' : String(rule.conditions.dropShopOnly)}
                          onChange={(e) =>
                            updateConditions(rule, {
                              dropShopOnly: e.target.value === 'any' ? null : e.target.value === 'true',
                            })
                          }
                          className={`${inputClass} w-full`}
                        >
                          <option value="any">Any</option>
                          <option value="false">Doorstep only</option>
                          <option value="true">Pickup points only</option>
                        </select>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[10px] text-gray-500">Couriers (none selected = all)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {courierOptions.length === 0 && (
                          <span className="text-[11px] text-gray-400">
                            Select services in the Service Catalogue first.
                          </span>
                        )}
                        {courierOptions.map((c) => {
                          const on = rule.conditions.couriers.includes(c);
                          return (
                            <button
                              key={c}
                              onClick={() =>
                                updateConditions(rule, {
                                  couriers: on
                                    ? rule.conditions.couriers.filter((x) => x !== c)
                                    : [...rule.conditions.couriers, c],
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                                on
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(
                        [
                          ['Order value from (£)', 'minOrderValue'],
                          ['Order value to (£)', 'maxOrderValue'],
                          ['Weight from (kg)', 'minWeightKg'],
                          ['Weight to (kg)', 'maxWeightKg'],
                          ['Quote from (£)', 'minPrice'],
                          ['Quote to (£)', 'maxPrice'],
                        ] as const
                      ).map(([label, key]) => (
                        <label key={key} className="space-y-1">
                          <span className="block text-[10px] text-gray-500">{label}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={rule.conditions[key] ?? ''}
                            onChange={(e) => updateConditions(rule, { [key]: numberOrNull(e.target.value) } as any)}
                            placeholder="any"
                            className={`${inputClass} w-full`}
                          />
                        </label>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={rule.stopIfMatched}
                        onChange={(e) => update(rule.id, { stopIfMatched: e.target.checked })}
                        className="w-4 h-4 rounded accent-sky-600"
                      />
                      <span className="text-[11px] text-gray-700">
                        Stop here — don't apply any later rules when this one matches
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="border border-sky-200 bg-sky-50/40 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-gray-900">Preview</h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="block text-[10px] text-gray-500">Carrier quote (£)</span>
            <input
              type="number"
              step="0.01"
              value={samplePrice}
              onChange={(e) => setSamplePrice(parseFloat(e.target.value) || 0)}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] text-gray-500">Courier</span>
            <input
              value={sampleCourier}
              onChange={(e) => setSampleCourier(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] text-gray-500">Country</span>
            <input
              value={sampleCountry}
              onChange={(e) => setSampleCountry(e.target.value.toUpperCase())}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] text-gray-500">Order value (£)</span>
            <input
              type="number"
              value={sampleOrderValue}
              onChange={(e) => setSampleOrderValue(parseFloat(e.target.value) || 0)}
              className={`${inputClass} w-full`}
            />
          </label>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-mono">£{samplePrice.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400">carrier quote</span>
          </div>
          {preview.applied.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-600 pl-3">
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-mono">£{a.to.toFixed(2)}</span>
              <span className="text-[10px] text-gray-500">
                {a.ruleName} — {a.description}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-sky-200 mt-2">
            <span className="text-base font-bold text-gray-900">£{preview.price.toFixed(2)}</span>
            <span className="text-[10px] text-gray-500">
              customer pays{preview.applied.length === 0 ? ' — no rules matched, passed through' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
