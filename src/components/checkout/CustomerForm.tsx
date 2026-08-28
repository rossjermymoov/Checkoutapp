import React from 'react';
import { Truck, MapPin, Sparkles, Check, Building2, User, Phone, Mail } from 'lucide-react';
import { CheckoutStore } from '../../store/checkoutStore';
import { SettingsStore } from '../../store/settingsStore';

interface CustomerFormProps {
  onProceedToShipping: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onProceedToShipping }) => {
  const checkout = CheckoutStore.getInstance();
  const settings = SettingsStore.getInstance();
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    return checkout.subscribe(() => setTick((t) => t + 1));
  }, [checkout]);

  const customer = checkout.customer;
  const deliveryMode = checkout.deliveryMode;

  const handleInputChange = (field: string, value: any) => {
    checkout.updateCustomer({ [field]: value });
  };

  const handlePostcodeBlur = () => {
    // When postcode changes, re-fetch rates and pickup locations
    checkout.calculateRates();
    checkout.loadPickupLocations();
  };

  const setSampleAddress = (postcode: string, city: string, street: string, county: string) => {
    checkout.updateCustomer({
      postcode,
      city,
      address1: street,
      county,
    });
    setTimeout(() => {
      checkout.calculateRates();
      checkout.loadPickupLocations();
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Express Checkout Mock */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">
          Express Checkout
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            className="h-11 bg-[#5A31F4] hover:bg-[#4822db] text-white rounded-xl font-medium text-sm flex items-center justify-center transition-all shadow-sm"
          >
            <span className="font-bold tracking-tight">shop</span>
            <span className="bg-white text-[#5A31F4] text-xs font-bold px-1 py-0.5 rounded ml-1">Pay</span>
          </button>
          <button
            type="button"
            className="h-11 bg-[#FFC439] hover:bg-[#f2b82f] text-[#003087] rounded-xl font-bold text-sm flex items-center justify-center transition-all shadow-sm italic"
          >
            PayPal
          </button>
          <button
            type="button"
            className="h-11 bg-black hover:bg-gray-800 text-white rounded-xl font-medium text-sm flex items-center justify-center transition-all shadow-sm"
          >
            Pay
          </button>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-medium">Or enter details</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
      </div>

      {/* Quick Test Postcode Presets */}
      <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-sky-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Quick Test UK Addresses:
          </span>
          <span className="text-[11px] text-sky-700">Click to autofill</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSampleAddress('SY11 4FN', 'Oswestry', '9 Mellor Meadows', 'Shropshire')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
              customer.postcode === 'SY11 4FN'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-100'
            }`}
          >
            Oswestry (SY11 4FN)
          </button>
          <button
            type="button"
            onClick={() => setSampleAddress('B66 1BY', 'Birmingham', 'Roebuck Lane', 'West Midlands')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
              customer.postcode === 'B66 1BY'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-100'
            }`}
          >
            Birmingham (B66 1BY)
          </button>
          <button
            type="button"
            onClick={() => setSampleAddress('LS1 2JP', 'Leeds', '2 Infirmary Street', 'West Yorkshire')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
              customer.postcode === 'LS1 2JP'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-100'
            }`}
          >
            Leeds (LS1 2JP)
          </button>
          <button
            type="button"
            onClick={() => setSampleAddress('SW1A 1AA', 'London', 'Buckingham Palace Rd', 'Greater London')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
              customer.postcode === 'SW1A 1AA'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-100'
            }`}
          >
            London (SW1A 1AA)
          </button>
        </div>
      </div>

      {/* Contact Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-600" />
            Contact Information
          </h3>
          <span className="text-xs text-gray-500">Already have an account? <a href="#login" className="text-sky-600 hover:underline">Log in</a></span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="ross.jermy@moovparcel.co.uk"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={customer.marketingConsent}
              onChange={(e) => handleInputChange('marketingConsent', e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-gray-300"
            />
            <span>Email me with news and exclusive Moov Parcel delivery offers</span>
          </label>
        </div>
      </div>

      {/* Delivery Mode Choice (Ship vs Pick Up) */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-700">Delivery Method</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => checkout.setDeliveryMode('courier')}
            className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
              deliveryMode === 'courier'
                ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20 text-gray-900'
                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
            }`}
          >
            <div className={`p-2 rounded-lg ${deliveryMode === 'courier' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ship to address</p>
              <p className="text-xs text-gray-500">Delivered directly to your door</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              checkout.setDeliveryMode('drop_shop');
              checkout.loadPickupLocations();
            }}
            className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
              deliveryMode === 'drop_shop'
                ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20 text-gray-900'
                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
            }`}
          >
            <div className={`p-2 rounded-lg ${deliveryMode === 'drop_shop' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pick up point</p>
              <p className="text-xs text-gray-500">Drop shops & 24/7 lockers</p>
            </div>
          </button>
        </div>
      </div>

      {/* Shipping Address Inputs */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-600" />
          {deliveryMode === 'courier' ? 'Delivery Address' : 'Search Locations Near Postcode'}
        </h3>

        <div className="space-y-3">
          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Country / Region</label>
            <select
              value={customer.countryIso}
              onChange={(e) => handleInputChange('countryIso', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            >
              <option value="GB">United Kingdom (GB)</option>
              <option value="IE">Ireland (IE)</option>
              <option value="FR">France (FR)</option>
              <option value="DE">Germany (DE)</option>
            </select>
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={customer.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Ross"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={customer.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Jermy"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={customer.address1}
              onChange={(e) => handleInputChange('address1', e.target.value)}
              placeholder="9 Mellor Meadows"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
            <input
              type="text"
              value={customer.address2}
              onChange={(e) => handleInputChange('address2', e.target.value)}
              placeholder="Whittington"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* City, County, Postcode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City / Town</label>
              <input
                type="text"
                value={customer.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Oswestry"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                value={customer.county}
                onChange={(e) => handleInputChange('county', e.target.value)}
                placeholder="Shropshire"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Postcode</label>
              <input
                type="text"
                value={customer.postcode}
                onChange={(e) => handleInputChange('postcode', e.target.value.toUpperCase())}
                onBlur={handlePostcodeBlur}
                placeholder="SY11 4FN"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold uppercase text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone number (for delivery SMS updates)</label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="07841 552 355"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onProceedToShipping}
          className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 transition-all flex items-center justify-center space-x-2"
        >
          <span>Continue to Shipping Options</span>
          <Check className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
