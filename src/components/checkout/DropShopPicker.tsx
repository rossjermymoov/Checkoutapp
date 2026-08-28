import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, Layers } from 'lucide-react';
import { CheckoutStore } from '../../store/checkoutStore';
import { SettingsStore } from '../../store/settingsStore';
import { PickupLocationItem } from '../../types/api';
import { DropShopMap } from './DropShopMap';
import { CourierLogo } from '../common/CourierLogo';

interface DropShopPickerProps {
  onProceedToPayment: () => void;
  onBackToInformation: () => void;
}

export const DropShopPicker: React.FC<DropShopPickerProps> = ({
  onProceedToPayment,
  onBackToInformation,
}) => {
  const checkout = CheckoutStore.getInstance();
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [postcodeSearch, setPostcodeSearch] = useState(checkout.customer.postcode);

  useEffect(() => {
    checkout.loadPickupLocations();
    return checkout.subscribe(() => {
      setTick((t) => t + 1);
      setPostcodeSearch(checkout.customer.postcode);
    });
  }, [checkout]);

  const locations = checkout.pickupLocations;
  const selectedLocation = checkout.selectedPickupLocation;
  const isLoading = checkout.isLoadingLocations;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcodeSearch) return;
    checkout.updateCustomer({ postcode: postcodeSearch.toUpperCase() });
    checkout.loadPickupLocations();
  };

  // Courier colour badges replaced by the courier logo itself.

  return (
    <div className="space-y-6">
      {/* Header & Postcode Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              Choose a Drop Shop / Pick-Up Location
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a convenient local parcel shop or 24/7 locker near you
            </p>
          </div>

          {/* Search Postcode Form */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <input
              type="text"
              value={postcodeSearch}
              onChange={(e) => setPostcodeSearch(e.target.value)}
              placeholder="Enter postcode..."
              className="px-3 py-1.5 text-xs font-semibold uppercase bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white w-32"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Find</span>
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            Interactive Map & Nearby Locations
          </span>
          <span className="text-xs text-gray-500">
            Found {locations.length} locations within {settings.dropShop.maxRadiusMiles} miles
          </span>
        </div>

        <DropShopMap
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={(loc) => checkout.selectPickupLocation(loc)}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-xl space-y-3">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-gray-600">Querying live drop shop networks...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && locations.length === 0 && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            {checkout.dropShopRates.length === 0 ? (
              <>
                <p className="font-semibold text-amber-900">No pickup-point services configured</p>
                <p className="mt-1">
                  Pickup points are priced by the service that carries them. In{' '}
                  <strong>Settings → Couriers &amp; Services</strong>, mark the drop-off services you sell (for example
                  DPD Drop Off Next Day, Yodel C2C) as pickup-point services.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-900">
                  No pickup points found near {checkout.customer.postcode}
                </p>
                <p className="mt-1">
                  Try another postcode, or switch back to door-to-door delivery.
                </p>
              </>
            )}
            {Object.entries(checkout.dropShopErrors).map(([courier, err]) => (
              <p key={courier} className="mt-2 text-amber-700">
                <strong>{courier}:</strong> {err}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Location Cards List */}
      {!isLoading && locations.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {locations.map((loc) => {
            const isSelected = selectedLocation?.pickupLocation.pickupLocationCode === loc.pickupLocation.pickupLocationCode;
            const courier = loc.pickupLocation.courier || 'DPD';
            const org = loc.pickupLocation.address?.organisation || loc.pickupLocation.shortName || 'ParcelShop';
            const street = loc.pickupLocation.address?.street;
            const town = loc.pickupLocation.address?.town || loc.pickupLocation.address?.locality;
            const postcode = loc.pickupLocation.address?.postcode;

            return (
              <div
                key={loc.pickupLocation.pickupLocationCode}
                onClick={() => checkout.selectPickupLocation(loc)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/40 shadow-sm ring-1 ring-sky-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 min-w-0">
                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isSelected ? 'border-sky-600 bg-sky-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    <CourierLogo courier={courier} size={36} />

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">{org}</span>
                      </div>

                      <p className="text-xs text-gray-600">
                        {street ? `${street}, ` : ''}{town ? `${town}, ` : ''}<span className="font-semibold text-gray-800">{postcode}</span>
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-gray-500 pt-1">
                        <span className="flex items-center gap-1 text-sky-700 font-semibold">
                          <Navigation className="w-3 h-3 text-sky-600" />
                          {loc.distance.toFixed(2)} miles away
                        </span>

                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {loc.pickupLocation.openLate ? 'Open Late (until 22:00)' : 'Mon-Sat 08:00 - 18:00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price is the carrier's quote for the drop-off service that
                      serves this shop — not a flat rate stamped on every card. */}
                  <div className="text-right flex-shrink-0">
                    {(() => {
                      const service = checkout.getDropShopServiceForCourier(loc.pickupLocation.courier);
                      if (!service) {
                        return (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 block">
                            Not priced
                          </span>
                        );
                      }
                      return (
                        <>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 block">
                            {service.price === 0 ? 'Free' : `£${service.price.toFixed(2)}`}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-1">{service.leadTime}</span>
                        </>
                      );
                    })()}
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
          disabled={!selectedLocation || isLoading}
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
