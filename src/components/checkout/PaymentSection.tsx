import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, CheckCircle2, ChevronRight, AlertCircle, Building2 } from 'lucide-react';
import { CheckoutStore } from '../../store/checkoutStore';

interface PaymentSectionProps {
  onBackToShipping: () => void;
  onOrderComplete: () => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  onBackToShipping,
  onOrderComplete,
}) => {
  const checkout = CheckoutStore.getInstance();
  const [, setTick] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'klarna' | 'cod'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardName, setCardName] = useState(`${checkout.customer.firstName} ${checkout.customer.lastName}`);
  const [sameAsShipping, setSameAsShipping] = useState(true);

  React.useEffect(() => {
    return checkout.subscribe(() => setTick((t) => t + 1));
  }, [checkout]);

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      checkout.placeOrder(
        paymentMethod === 'card'
          ? 'Credit Card (•••• 4242)'
          : paymentMethod === 'klarna'
          ? 'Klarna Pay in 3'
          : 'Cash on Delivery'
      );
      setIsProcessing(false);
      onOrderComplete();
    }, 900);
  };

  const selectedShipping = checkout.selectedShipping;
  const total = checkout.getTotal();

  return (
    <form onSubmit={handlePayNow} className="space-y-6">
      {/* Review Summary Box */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs space-y-2.5 divide-y divide-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-600">
            <span className="w-16 font-medium text-gray-500">Contact</span>
            <span className="text-gray-900 font-medium truncate max-w-[220px] sm:max-w-xs">{checkout.customer.email}</span>
          </div>
          <button
            type="button"
            onClick={onBackToShipping}
            className="text-sky-600 hover:text-sky-800 font-medium text-xs"
          >
            Change
          </button>
        </div>

        <div className="flex items-center justify-between pt-2.5">
          <div className="flex items-center space-x-3 text-gray-600">
            <span className="w-16 font-medium text-gray-500">Method</span>
            <span className="text-gray-900 truncate max-w-[220px] sm:max-w-xs">
              {selectedShipping?.serviceName} — {selectedShipping?.price === 0 ? 'Free' : `£${selectedShipping?.price.toFixed(2)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onBackToShipping}
            className="text-sky-600 hover:text-sky-800 font-medium text-xs"
          >
            Change
          </button>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-600" />
            Payment Method
          </h3>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" /> Encrypted & Secure
          </span>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 bg-white">
          {/* Credit Card Option */}
          <div className="p-4 bg-gray-50/50">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-semibold text-gray-900">Credit or Debit Card</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-blue-800">VISA</span>
                <span className="text-[10px] font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-red-600">MC</span>
                <span className="text-[10px] font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-blue-500">AMEX</span>
              </div>
            </label>

            {paymentMethod === 'card' && (
              <div className="mt-4 space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Card number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiration date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM / YY"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Security code (CVV)</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="CVC"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name on card</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Klarna Option */}
          <div className="p-4 bg-white">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'klarna'}
                  onChange={() => setPaymentMethod('klarna')}
                  className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-semibold text-gray-900">Klarna (Pay in 3 interest-free payments)</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-700">Klarna.</span>
            </label>
          </div>
        </div>
      </div>

      {/* Billing Address Option */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Billing Address</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 bg-white">
          <label className="p-4 flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="billingSame"
              checked={sameAsShipping}
              onChange={() => setSameAsShipping(true)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-gray-900">Same as shipping address</span>
          </label>
          <label className="p-4 flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="billingSame"
              checked={!sameAsShipping}
              onChange={() => setSameAsShipping(false)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-gray-900">Use a different billing address</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBackToShipping}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Return to shipping options
        </button>

        <button
          type="submit"
          disabled={isProcessing}
          className="px-8 py-4 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-base font-bold shadow-xl transition-all flex items-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Authorizing Payment...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Pay £{total.toFixed(2)} Now</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
