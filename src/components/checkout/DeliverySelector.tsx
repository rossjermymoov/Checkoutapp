import React, { useState, useEffect } from 'react';
import { Truck, Clock, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { CheckoutStore } from '../../store/checkoutStore';
import { SettingsStore } from '../../store/settingsStore';
import { SelectedShippingOption } from '../../types/checkout';

interface DeliverySelectorProps {
  onProceedToPayment: () => void;
  onBackToInformation: () => void;
}

export const DeliverySelector: React.FC<DeliverySelectorProps> = ({
  onProceedToPayment,
  onBackToInformation,
}) => {
  const checkout = CheckoutStore.getInstance();
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);

  useEffect(() => {
    // Automatically query rates if not calculated yet
    if (checkout.shippingRates.length === 0) {
      checkout.calculateRates();
    }
    return checkout.subscribe(() => setTick((t) => t + 1));
  }, [checkout]);

  const rates = checkout.shippingRates;
  const selected = checkout.selectedShipping;
  const isLoading = checkout.isLoadingRates;

  const getCourierLogo = (courierName: string) => {
    const courier = settings.couriers.find(
      (c) => c.key.toLowerCase() === courierName.toLowerCase() || c.name.toLowerCase().includes(courierName.toLowerCase())
    );
    if (courier && courier.logo) return courier.logo;
    if (courierName.toLowerCase().includes('dpd')) return 'https://app.heyvoila.io/courier-service-logos/dpd.jpg';
    if (courierName.toLowerCase().includes('evri')) return 'https://app.heyvoila.io/courier-service-logos/evri.jpg';
    if (courierName.toLowerCase().includes('ups')) return 'https://app.heyvoila.io/courier-service-logos/ups.jpg';
    if (courierName.toLowerCase().includes('dhl')) return 'https://app.heyvoila.io/courier-service-logos/dhl.jpg';
    if (courierName.toLowerCase().includes('royal')) return 'https://app.heyvoila.io/courier-service-logos/royalmail.jpg';
    return 'https://app.heyvoila.io/courier-service-logos/dpd.jpg';
  };

  return (
    <div className="space-y-6">
      {/* Address Review Summary Box */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs space-y-2.5 divide-y divide-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-600">
            <span className="w-16 font-medium text-gray-500">Contact</span>
            <span className="text-gray-900 font-medium truncate max-w-[220px] sm:max-w-xs">{checkout.customer.email}</span>
          </div>
          <button
            onClick={onBackToInformation}
            className="text-sky-600 hover:text-sky-800 font-medium text-xs"
          >
            Change
          </button>
        </div>

        <div className="flex items-center justify-between pt-2.5">
          <div className="flex items-center space-x-3 text-gray-600">
            <span className="w-16 font-medium text-gray-500">Ship to</span>
            <span className="text-gray-900 truncate max-w-[220px] sm:max-w-xs">
              {checkout.customer.address1}, {checkout.customer.city}, {checkout.customer.postcode}
            </span>
          </div>
          <button
            onClick={onBackToInformation}
            className="text-sky-600 hover:text-sky-800 font-medium text-xs"
          >
            Change
          </button>
        </div>
      </div>

      {/* Shipping Options Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            Select Shipping Method
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Rates dynamically calculated for postcode <span className="font-semibold text-gray-700">{checkout.customer.postcode}</span>
          </p>
        </div>

        <button
          onClick={() => checkout.calculateRates()}
          disabled={isLoading}
          className="flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Rates</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-xl space-y-3">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-gray-600">Querying carrier pricing & service routes...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && rates.length === 0 && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">No enabled shipping services available</p>
            <p className="mt-1">
              Please open the <strong>Carrier Settings</strong> tab to enable carriers and configure active delivery services.
            </p>
          </div>
        </div>
      )}

      {/* Courier Options List */}
      {!isLoading && rates.length > 0 && (
        <div className="space-y-3">
          {rates.map((option) => {
            const isSelected = selected?.serviceId === option.serviceId;
            const logo = getCourierLogo(option.courier);

            return (
              <div
                key={option.serviceId}
                onClick={() => checkout.selectShippingOption(option)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/40 shadow-sm ring-1 ring-sky-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'border-sky-600 bg-sky-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Courier Logo */}
                    <div className="w-11 h-11 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center p-1 flex-shrink-0 overflow-hidden shadow-xs">
                      <img
                        src={logo}
                        alt={option.courier}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Service Name & Transit Time */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {option.serviceName}
                        </span>
                        {option.serviceId.includes('DPD-12') && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Fastest
                          </span>
                        )}
                        {option.serviceId.includes('NEXT-DAY') && !option.serviceId.includes('12') && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            Popular
                          </span>
                        )}
                        {option.serviceId.includes('EVRI-STANDARD') && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Best Value
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{option.leadTime}</span>
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    {option.price === 0 ? (
                      <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">
                        Free
                      </span>
                    ) : (
                      <span className="text-base font-bold text-gray-900">
                        £{option.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBackToInformation}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Return to customer info
        </button>

        <button
          type="button"
          disabled={!selected || isLoading}
          onClick={onProceedToPayment}
          className="px-6 py-3.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 transition-all flex items-center space-x-2"
        >
          <span>Continue to Payment</span>
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
