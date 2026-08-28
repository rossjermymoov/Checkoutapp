import React, { useState } from 'react';
import { Tag, Plus, Minus, Trash2, Check, Lock, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { CheckoutStore } from '../../store/checkoutStore';

export const CartSummary: React.FC = () => {
  const checkout = CheckoutStore.getInstance();
  const [, setTick] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isMobileAccordionOpen, setIsMobileAccordionOpen] = useState(false);

  React.useEffect(() => {
    return checkout.subscribe(() => setTick((t) => t + 1));
  }, [checkout]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (!couponInput.trim()) return;

    const success = checkout.applyCoupon(couponInput);
    if (success) {
      setCouponSuccess(`Coupon ${couponInput.toUpperCase()} applied!`);
      setCouponInput('');
      checkout.calculateRates();
    } else {
      setCouponError('Invalid coupon code. Try SAVE10 or FREESHIP');
    }
  };

  const subtotal = checkout.getSubtotal();
  const discount = checkout.discountAmount;
  const shippingPrice = checkout.selectedShipping ? checkout.selectedShipping.price : null;
  const tax = checkout.getTax();
  const total = checkout.getTotal();

  return (
    <div className="bg-white lg:bg-transparent rounded-2xl lg:rounded-none border lg:border-none border-gray-200 shadow-sm lg:shadow-none">
      {/* Mobile Accordion Header */}
      <div
        className="lg:hidden p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer rounded-t-2xl"
        onClick={() => setIsMobileAccordionOpen(!isMobileAccordionOpen)}
      >
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
          <Package className="w-4 h-4 text-sky-600" />
          <span>{isMobileAccordionOpen ? 'Hide order summary' : 'Show order summary'}</span>
          {isMobileAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        <span className="text-base font-bold text-gray-900">£{total.toFixed(2)}</span>
      </div>

      {/* Main Content */}
      <div className={`p-6 lg:p-0 ${isMobileAccordionOpen ? 'block' : 'hidden lg:block'} space-y-6 pt-3`}>
        {/* Product Items */}
        <div className="space-y-4 divide-y divide-gray-100 pt-1">
          {checkout.cart.map((item) => (
            <div key={item.id} className="pt-4 first:pt-2 flex items-center justify-between gap-4">
              <div className="relative flex-shrink-0 pt-1 pr-1">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm"
                />
                <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-gray-700 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10 border border-white">
                  {item.quantity}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                <p className="text-xs text-gray-500 truncate">{item.variant}</p>
                <div className="flex items-center space-x-2 mt-1.5">
                  <button
                    onClick={() => checkout.updateCartQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-xs font-medium text-gray-700">{item.quantity}</span>
                  <button
                    onClick={() => checkout.updateCartQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">£{(item.price * item.quantity).toFixed(2)}</p>
                {item.originalPrice && (
                  <p className="text-xs text-gray-400 line-through">
                    £{(item.originalPrice * item.quantity).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Discount Code Input */}
        <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2 border-t border-gray-200">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Discount code (try SAVE10)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex-shrink-0"
            >
              Apply
            </button>
          </div>
          {couponError && <p className="text-xs text-rose-600 font-medium pl-1">{couponError}</p>}
          {couponSuccess && (
            <p className="text-xs text-emerald-600 font-medium pl-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {couponSuccess}
            </p>
          )}
          {checkout.couponCode && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
              <Tag className="w-3 h-3" />
              <span>{checkout.couponCode}</span>
              <button
                type="button"
                onClick={() => {
                  checkout.applyCoupon('');
                  setCouponSuccess('');
                }}
                className="ml-1 text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </form>

        {/* Pricing Calculation Breakdown */}
        <div className="space-y-3 pt-4 border-t border-gray-200 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900">£{subtotal.toFixed(2)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount</span>
              <span>-£{discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className="font-medium text-gray-900">
              {shippingPrice === null ? (
                <span className="text-xs text-gray-400">Calculated next</span>
              ) : shippingPrice === 0 ? (
                <span className="text-emerald-600 font-semibold uppercase text-xs tracking-wider">Free</span>
              ) : (
                `£${shippingPrice.toFixed(2)}`
              )}
            </span>
          </div>

          <div className="flex justify-between text-gray-500 text-xs">
            <span>Estimated VAT (20% included)</span>
            <span>£{tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-baseline pt-4 border-t border-gray-200">
            <div className="space-y-0.5">
              <span className="text-base font-bold text-gray-900">Total</span>
              <p className="text-xs text-gray-500">Including all duties and courier taxes</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                £{total.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-gray-500 block uppercase">GBP</span>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guaranteed Safe & Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};
