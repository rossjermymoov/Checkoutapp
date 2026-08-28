import { CartProduct, CustomerDetails, SelectedShippingOption, OrderConfirmation } from '../types/checkout';
import { PickupLocationItem } from '../types/api';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMER } from '../services/mockData';
import { getBillingQuote, getPickupLocations, getCourierPresets } from '../services/api';
import { SettingsStore } from './settingsStore';

const CHECKOUT_STORAGE_KEY = 'checkout_demo_state_v2';

export class CheckoutStore {
  private static instance: CheckoutStore;
  private subscribers = new Set<() => void>();

  public cart: CartProduct[] = DEFAULT_PRODUCTS;
  public customer: CustomerDetails = DEFAULT_CUSTOMER;
  public deliveryMode: 'courier' | 'drop_shop' = 'courier';
  public selectedShipping: SelectedShippingOption | null = null;
  public shippingRates: SelectedShippingOption[] = [];
  public pickupLocations: PickupLocationItem[] = [];
  public selectedPickupLocation: PickupLocationItem | null = null;
  public isLoadingRates: boolean = false;
  public isLoadingLocations: boolean = false;
  public couponCode: string = '';
  public discountAmount: number = 0;
  public step: 'information' | 'shipping' | 'payment' | 'confirmation' = 'information';
  public lastOrder: OrderConfirmation | null = null;

  private constructor() {
    const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.customer) this.customer = { ...DEFAULT_CUSTOMER, ...parsed.customer };
        if (parsed.cart && parsed.cart.length > 0) this.cart = parsed.cart;
      } catch (e) {
        // use defaults
      }
    }
  }

  public static getInstance(): CheckoutStore {
    if (!CheckoutStore.instance) {
      CheckoutStore.instance = new CheckoutStore();
    }
    return CheckoutStore.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() {
    this.save();
    this.subscribers.forEach((cb) => cb());
  }

  private save() {
    localStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify({
        customer: this.customer,
        cart: this.cart,
      })
    );
  }

  public updateCustomer(updates: Partial<CustomerDetails>) {
    this.customer = { ...this.customer, ...updates };
    this.notify();
  }

  public updateCartQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.cart = this.cart.filter((p) => p.id !== productId);
    } else {
      this.cart = this.cart.map((p) => (p.id === productId ? { ...p, quantity } : p));
    }
    this.notify();
    this.calculateRates();
  }

  public applyCoupon(code: string): boolean {
    this.couponCode = code.trim().toUpperCase();
    if (this.couponCode === 'SAVE10' || this.couponCode === 'DEMO10') {
      this.discountAmount = 10;
    } else if (this.couponCode === 'FREESHIP') {
      this.discountAmount = 0;
    } else if (this.couponCode === 'VIP20') {
      this.discountAmount = this.getSubtotal() * 0.2;
    } else {
      this.discountAmount = 0;
      this.notify();
      return false;
    }
    this.notify();
    return true;
  }

  public setDeliveryMode(mode: 'courier' | 'drop_shop') {
    this.deliveryMode = mode;
    if (mode === 'courier') {
      if (this.shippingRates.length > 0 && (!this.selectedShipping || this.selectedShipping.type === 'drop_shop')) {
        this.selectedShipping = this.shippingRates[0];
      }
    } else {
      if (this.pickupLocations.length > 0 && !this.selectedPickupLocation) {
        this.selectPickupLocation(this.pickupLocations[0]);
      }
    }
    this.notify();
  }

  public selectShippingOption(option: SelectedShippingOption) {
    this.selectedShipping = option;
    this.notify();
  }

  public selectPickupLocation(location: PickupLocationItem) {
    this.selectedPickupLocation = location;
    const settings = SettingsStore.getInstance();
    const isFree = settings.pricing.freeShippingThreshold && this.getSubtotal() >= settings.pricing.freeShippingThreshold;
    const basePrice = 2.49;
    const finalPrice = isFree || this.couponCode === 'FREESHIP' ? 0 : basePrice;
    const org = location.pickupLocation.address?.organisation || location.pickupLocation.shortName || 'Drop Shop';

    this.selectedShipping = {
      type: 'drop_shop',
      serviceId: location.pickupLocation.pickupLocationCode,
      serviceName: `${org} (${location.pickupLocation.courier || 'Pickup'})`,
      courier: location.pickupLocation.courier || 'DPD',
      leadTime: `Next Day Collection (${location.distance.toFixed(1)} miles away)`,
      price: finalPrice,
      originalPrice: basePrice,
      dropShopDetails: {
        code: location.pickupLocation.pickupLocationCode,
        organisation: org,
        street: location.pickupLocation.address?.street || '',
        town: location.pickupLocation.address?.town || '',
        postcode: location.pickupLocation.address.postcode,
        distance: location.distance,
        hours: location.pickupLocation.openLate ? 'Open Late (07:00 - 22:00)' : 'Standard Hours (08:00 - 18:00)',
        latitude: location.addressPoint?.latitude,
        longitude: location.addressPoint?.longitude,
      }
    };
    this.notify();
  }

  public setStep(step: 'information' | 'shipping' | 'payment' | 'confirmation') {
    this.step = step;
    this.notify();
  }

  public getSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  public getTotalWeightKg(): number {
    return this.cart.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
  }

  public getTax(): number {
    return (this.getSubtotal() - this.discountAmount) * 0.2;
  }

  public getTotal(): number {
    const subtotal = this.getSubtotal();
    const discount = this.discountAmount;
    const shipping = this.selectedShipping ? this.selectedShipping.price : 0;
    return Math.max(0, subtotal - discount + shipping);
  }

  public async calculateRates() {
    const settings = SettingsStore.getInstance();
    this.isLoadingRates = true;
    this.notify();

    try {
      const quoteRes = await getBillingQuote(this.customer, settings.credentials, this.getTotalWeightKg());
      const quotes = quoteRes.quotes;

      const subtotal = this.getSubtotal();
      const isFreeThresholdMet = settings.pricing.freeShippingThreshold !== null && subtotal >= settings.pricing.freeShippingThreshold;

      const enabledCourierKeys = new Set(settings.couriers.filter(c => c.enabled).map(c => c.key));
      const activeServices = settings.services.filter(
        (s) => s.enabled && !s.isDropShop && enabledCourierKeys.has(s.courier)
      );

      const options: SelectedShippingOption[] = activeServices.map((service) => {
        let baseRate = service.priceOverride ?? quotes[service.dc_service_id] ?? settings.pricing.defaultFallbackRate;

        let finalRate = baseRate;
        if (settings.pricing.markupType === 'fixed') {
          finalRate += settings.pricing.markupValue;
        } else if (settings.pricing.markupType === 'percentage') {
          finalRate = finalRate * (1 + settings.pricing.markupValue / 100);
        }

        if (isFreeThresholdMet || this.couponCode === 'FREESHIP') {
          finalRate = 0;
        }

        return {
          type: 'courier',
          serviceId: service.dc_service_id,
          serviceName: service.displayName || service.originalName,
          courier: service.courier,
          leadTime: service.leadTime || 'Next Day',
          price: Number(finalRate.toFixed(2)),
          originalPrice: Number(baseRate.toFixed(2)),
        };
      });

      this.shippingRates = options;
      if (this.deliveryMode === 'courier' && (!this.selectedShipping || !options.find(o => o.serviceId === this.selectedShipping?.serviceId))) {
        this.selectedShipping = options[0] || null;
      }
    } catch (error) {
      console.error('Rate calculation error:', error);
    } finally {
      this.isLoadingRates = false;
      this.notify();
    }
  }

  public async loadPickupLocations() {
    const settings = SettingsStore.getInstance();
    if (!settings.dropShop.enabled) return;

    this.isLoadingLocations = true;
    this.notify();

    try {
      const enabledCouriers = settings.dropShop.enabledCouriers;
      const allLocations: PickupLocationItem[] = [];

      for (const courier of enabledCouriers) {
        const res = await getPickupLocations(courier, this.customer, settings.credentials);
        if (res.locations && res.locations.length > 0) {
          allLocations.push(...res.locations);
        }
      }

      const filtered = allLocations
        .filter((loc) => loc.distance <= settings.dropShop.maxRadiusMiles)
        .slice(0, settings.dropShop.maxLocations);

      this.pickupLocations = filtered.length > 0 ? filtered : allLocations.slice(0, settings.dropShop.maxLocations);

      if (this.deliveryMode === 'drop_shop' && this.pickupLocations.length > 0 && !this.selectedPickupLocation) {
        this.selectPickupLocation(this.pickupLocations[0]);
      }
    } catch (error) {
      console.error('Failed to load pickup locations:', error);
    } finally {
      this.isLoadingLocations = false;
      this.notify();
    }
  }

  public placeOrder(paymentMethod: string = 'Credit Card'): OrderConfirmation {
    const order: OrderConfirmation = {
      orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customer: { ...this.customer },
      items: [...this.cart],
      shipping: this.selectedShipping || {
        type: 'courier',
        serviceId: 'DEFAULT',
        serviceName: 'Standard Delivery',
        courier: 'DPD',
        leadTime: '1-2 Days',
        price: 4.95,
        originalPrice: 4.95
      },
      subtotal: this.getSubtotal(),
      discount: this.discountAmount,
      shippingPrice: this.selectedShipping ? this.selectedShipping.price : 0,
      tax: this.getTax(),
      total: this.getTotal(),
      paymentMethod,
    };

    this.lastOrder = order;
    this.step = 'confirmation';
    this.notify();
    return order;
  }

  public resetOrder() {
    this.step = 'information';
    this.lastOrder = null;
    this.notify();
  }
}
