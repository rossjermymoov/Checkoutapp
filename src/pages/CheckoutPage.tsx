import React from 'react';
import { ShieldCheck, ChevronRight, ShoppingBag, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { CheckoutStore } from '../store/checkoutStore';
import { CustomerForm } from '../components/checkout/CustomerForm';
import { DeliverySelector } from '../components/checkout/DeliverySelector';
import { DropShopPicker } from '../components/checkout/DropShopPicker';
import { PaymentSection } from '../components/checkout/PaymentSection';
import { CartSummary } from '../components/checkout/CartSummary';
import { OrderConfirmationPage } from './OrderConfirmationPage';

interface CheckoutPageProps {
  onOpenSettings: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onOpenSettings }) => {
  const checkout = CheckoutStore.getInstance();
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    return checkout.subscribe(() => setTick((t) => t + 1));
  }, [checkout]);

  const step = checkout.step;
  const deliveryMode = checkout.deliveryMode;

  if (step === 'confirmation') {
    return (
      <OrderConfirmationPage
        onNewOrder={() => checkout.resetOrder()}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Checkout Multi-Step Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Breadcrumb Stepper */}
          <nav className="flex items-center space-x-2 text-xs font-medium text-gray-500 pb-2">
            <button
              onClick={() => checkout.setStep('information')}
              className={`hover:text-gray-900 transition-colors ${
                step === 'information' ? 'text-sky-600 font-bold' : ''
              }`}
            >
              Information
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />

            <button
              onClick={() => checkout.setStep('shipping')}
              className={`hover:text-gray-900 transition-colors ${
                step === 'shipping' ? 'text-sky-600 font-bold' : ''
              }`}
            >
              Shipping
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />

            <span
              className={`${
                step === 'payment' ? 'text-sky-600 font-bold' : 'text-gray-400'
              }`}
            >
              Payment
            </span>
          </nav>

          {/* Step 1: Customer & Address Information */}
          {step === 'information' && (
            <CustomerForm
              onProceedToShipping={() => {
                checkout.setStep('shipping');
                checkout.calculateRates();
                if (deliveryMode === 'drop_shop') {
                  checkout.loadPickupLocations();
                }
              }}
            />
          )}

          {/* Step 2: Shipping Method or Drop Shop Picker */}
          {step === 'shipping' && (
            <>
              {deliveryMode === 'courier' ? (
                <DeliverySelector
                  onProceedToPayment={() => checkout.setStep('payment')}
                  onBackToInformation={() => checkout.setStep('information')}
                />
              ) : (
                <DropShopPicker
                  onProceedToPayment={() => checkout.setStep('payment')}
                  onBackToInformation={() => checkout.setStep('information')}
                />
              )}
            </>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <PaymentSection
              onBackToShipping={() => checkout.setStep('shipping')}
              onOrderComplete={() => {}}
            />
          )}

          {/* Footer Terms & Policy Links */}
          <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-400">
            <a href="#refund" className="hover:text-gray-600">Refund Policy</a>
            <a href="#shipping" className="hover:text-gray-600">Shipping Policy</a>
            <a href="#privacy" className="hover:text-gray-600">Privacy Policy</a>
            <a href="#terms" className="hover:text-gray-600">Terms of Service</a>
          </div>
        </div>

        {/* Right Column: Order Summary Column (Sticky on Desktop) */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 bg-gray-50/80 lg:bg-transparent p-4 sm:p-6 rounded-2xl border border-gray-200 lg:border-none">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
};
