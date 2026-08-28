import React from 'react';
import { CheckCircle, Package, Truck, MapPin, ArrowRight, Clock, ShieldCheck, Mail, ShoppingBag } from 'lucide-react';
import { CheckoutStore } from '../store/checkoutStore';
import { CartProduct } from '../types/checkout';

interface OrderConfirmationPageProps {
  onNewOrder: () => void;
  onOpenSettings: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  onNewOrder,
  onOpenSettings,
}) => {
  const checkout = CheckoutStore.getInstance();
  const order = checkout.lastOrder;

  if (!order) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">No active order found.</p>
        <button
          onClick={onNewOrder}
          className="px-6 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold"
        >
          Start New Checkout
        </button>
      </div>
    );
  }

  const isDropShop = order.shipping.type === 'drop_shop';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-200">
        {/* Success Header */}
        <div className="p-6 sm:p-8 text-center space-y-3 bg-gradient-to-b from-emerald-50/70 to-white">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Order Placed Successfully</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Thank you, {order.customer.firstName}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              We've sent a confirmation email to <span className="font-semibold text-gray-800">{order.customer.email}</span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-mono font-medium text-gray-700 shadow-xs">
            <span>Order #{order.orderNumber}</span>
            <span>•</span>
            <span>{order.createdAt}</span>
          </div>
        </div>

        {/* Live Tracking Status Preview */}
        <div className="p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            Carrier Dispatch & Tracking
          </h3>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800">
                Courier: <span className="text-sky-700 font-bold">{order.shipping.courier}</span>
              </span>
              <span className="font-mono text-gray-500">AWB: {order.shipping.serviceId}-{Math.floor(1000000 + Math.random() * 9000000)}</span>
            </div>

            {/* Tracking Steps Bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-xs font-bold">✓</div>
                <p className="font-semibold text-gray-900">Confirmed</p>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center mx-auto text-xs font-bold animate-pulse">2</div>
                <p className="font-semibold text-sky-800">Manifested</p>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto text-xs font-bold">3</div>
                <p className="text-gray-500">In Transit</p>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto text-xs font-bold">4</div>
                <p className="text-gray-500">{isDropShop ? 'Ready at Drop Shop' : 'Delivered'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Details */}
        <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              {isDropShop ? <MapPin className="w-3.5 h-3.5 text-sky-600" /> : <Truck className="w-3.5 h-3.5 text-sky-600" />}
              {isDropShop ? 'Pickup Point (Drop Shop)' : 'Delivery Address'}
            </h4>
            {isDropShop && order.shipping.dropShopDetails ? (
              <div className="text-sm text-gray-800 bg-sky-50/50 p-3.5 rounded-xl border border-sky-100">
                <p className="font-bold text-sky-900">{order.shipping.dropShopDetails.organisation}</p>
                <p className="text-xs text-gray-600 mt-0.5">{order.shipping.dropShopDetails.street}</p>
                <p className="text-xs font-bold text-gray-800">{order.shipping.dropShopDetails.postcode}</p>
                <p className="text-xs text-emerald-700 font-medium mt-1">🕒 {order.shipping.dropShopDetails.hours}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-800">
                <p className="font-semibold">{order.customer.firstName} {order.customer.lastName}</p>
                <p className="text-xs text-gray-600">{order.customer.address1}</p>
                {order.customer.address2 && <p className="text-xs text-gray-600">{order.customer.address2}</p>}
                <p className="text-xs text-gray-600">{order.customer.city}, {order.customer.postcode}</p>
                <p className="text-xs text-gray-500 mt-1">Tel: {order.customer.phone}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Service & Payment
            </h4>
            <div className="text-sm text-gray-800 space-y-1">
              <p className="font-semibold text-gray-900">{order.shipping.serviceName}</p>
              <p className="text-xs text-gray-500">{order.shipping.leadTime}</p>
              <p className="text-xs text-gray-600 pt-2">Payment: <span className="font-semibold text-gray-800">{order.paymentMethod}</span></p>
              <p className="text-xs text-gray-600">Total Paid: <span className="font-bold text-emerald-700 text-sm">£{order.total.toFixed(2)}</span></p>
            </div>
          </div>
        </div>

        {/* Purchased Items */}
        <div className="p-6 sm:p-8 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Items Ordered ({order.items.length})</h4>
          <div className="divide-y divide-gray-100">
            {order.items.map((item: CartProduct) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} • {item.variant}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">£{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 sm:p-8 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onOpenSettings}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center justify-center space-x-2"
          >
            <span>Open Carrier Settings Console</span>
          </button>

          <button
            onClick={onNewOrder}
            className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Place Another Test Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
