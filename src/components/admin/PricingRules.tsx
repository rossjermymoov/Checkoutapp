import React from 'react';
import { DollarSign, Percent, PlusCircle, Gift, Sliders } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';

export const PricingRules: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    return settings.subscribe(() => setTick((t) => t + 1));
  }, [settings]);

  const pricing = settings.pricing;

  const handleUpdate = (field: string, value: any) => {
    settings.updatePricing({ [field]: value });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Pricing Markup & Free Delivery Rules
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Adjust the rates returned by the billing quote endpoint with profit margins or promotions
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        {/* Markup Strategy */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">Markup Strategy</label>
          <select
            value={pricing.markupType}
            onChange={(e) => handleUpdate('markupType', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="none">Direct Pass-through (No Markup)</option>
            <option value="fixed">Fixed Handling Surcharge (+£)</option>
            <option value="percentage">Percentage Markup (+%)</option>
          </select>
        </div>

        {/* Markup Value */}
        {pricing.markupType !== 'none' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              {pricing.markupType === 'fixed' ? 'Fixed Surcharge Amount (£)' : 'Percentage Markup (%)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={pricing.markupValue}
              onChange={(e) => handleUpdate('markupValue', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Free Shipping Threshold */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-emerald-600" />
            Free Shipping Threshold (£)
          </label>
          <input
            type="number"
            step="1"
            value={pricing.freeShippingThreshold || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value);
              handleUpdate('freeShippingThreshold', val);
            }}
            placeholder="e.g. 150 (Leave empty to disable)"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-[11px] text-gray-500">Orders equal or above this amount get free delivery</span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1">
        <p className="font-semibold">Active Formula:</p>
        <p>
          Customer Price = (Quote Rate {pricing.markupType === 'fixed' ? `+ £${pricing.markupValue.toFixed(2)}` : pricing.markupType === 'percentage' ? `+ ${pricing.markupValue}%` : '+ £0.00'})
          {pricing.freeShippingThreshold ? ` | Waived (Free) if Cart Subtotal >= £${pricing.freeShippingThreshold}` : ''}
        </p>
      </div>
    </div>
  );
};
