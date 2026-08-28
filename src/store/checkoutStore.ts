import { CartProduct, CustomerDetails, SelectedShippingOption, OrderConfirmation } from '../types/checkout';
import { PickupLocationItem, QuotedService } from '../types/api';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMER } from '../services/mockData';
import { getBillingQuote, getPickupLocations } from '../services/api';
import { getServiceCatalogue, normaliseCourier, checkWeightEligibility } from '../services/serviceCatalogue';
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
  /** Why the rate list is empty or incomplete. Surfaced instead of hidden. */
  public ratesError: string | null = null;
  public catalogueError: string | null = null;
  public ratesFromLive: boolean = false;
  /** Services excluded by a rule, with the reason, e.g. a weight limit. */
  public unavailableNotices: string[] = [];
  /** Per-courier drop shop failures, e.g. UPS not enabled on the Voila account. */
  public dropShopErrors: Record<string, string> = {};
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

  /**
   * Quote-first rate calculation.
   *
   * The Billing API is asked what it will carry to THIS postcode and at what
   * price. It already applies each service's postcode restrictions and zone
   * pricing, so its response is the definitive list of what may be sold — we
   * render exactly that and nothing else. Voila presets are then joined on
   * dc_service_id purely to decorate each service with its published transit
   * time and proper name.
   *
   * Deliberately absent: any fallback rate. A service that was not quoted is
   * not offered, because quoting a price the courier has not given us is how
   * you end up selling DPD into the Highlands at a rate DPD will not honour.
   */
  public async calculateRates() {
    const settings = SettingsStore.getInstance();
    this.isLoadingRates = true;
    this.ratesError = null;
    this.unavailableNotices = [];
    this.notify();

    try {
      const isSandbox = !settings.credentials.useLiveApi;

      const [quoteRes, catalogueRes] = await Promise.all([
        isSandbox
          ? Promise.resolve({ services: [] as QuotedService[], quotes: {}, fromLive: false, error: undefined })
          : getBillingQuote(this.customer, settings.credentials, this.getTotalWeightKg()),
        getServiceCatalogue(settings.credentials),
      ]);

      this.ratesFromLive = quoteRes.fromLive;
      this.ratesError = quoteRes.error || null;
      this.catalogueError = catalogueRes.error || null;

      const catalogue = catalogueRes.catalogue;

      // Sandbox mode prices the merchant's OWN chosen services rather than a
      // fabricated list. It can therefore never surface a service code that
      // does not exist upstream, which is what made mock mode so misleading.
      const quotedServices: QuotedService[] = isSandbox
        ? settings.services
            .filter((s) => s.enabled)
            .map((s) => {
              const meta = catalogue.get(s.dc_service_id);
              const days = meta?.leadTime.days;
              const sandboxPrice = days === 0 ? 9.95 : days === 1 ? 5.95 : days === 2 ? 4.95 : days === 3 ? 3.95 : 4.5;
              return {
                code: s.dc_service_id,
                name: meta?.name || s.originalName || s.dc_service_id,
                courier: meta?.courier || s.courier,
                price: sandboxPrice,
              };
            })
        : quoteRes.services;
      const subtotal = this.getSubtotal();
      const isFreeThresholdMet =
        settings.pricing.freeShippingThreshold !== null && subtotal >= settings.pricing.freeShippingThreshold;

      // The merchant console decorates and may suppress; it no longer decides
      // what exists. Match its entries to quoted services by dc_service_id.
      const overrides = new Map(settings.services.map((s) => [s.dc_service_id, s]));
      const totalWeight = this.getTotalWeightKg();
      const notices: string[] = [];

      const options: SelectedShippingOption[] = quotedServices
        .map((quoted) => {
          const meta = catalogue.get(quoted.code);
          const override = overrides.get(quoted.code);
          const courier = meta?.courier || normaliseCourier(quoted.courier) || 'Unknown';
          return { quoted, meta, override, courier };
        })
        .filter(({ quoted, meta, override, courier }) => {
          // STRICT ALLOW-LIST. A service sells only if the merchant has chosen
          // it in the Service Catalogue and left it enabled. The Billing API
          // quoting something is necessary but not sufficient — otherwise a new
          // route added upstream would start selling itself without review.
          if (!override) {
            notices.push(`${quoted.name} was quoted but is not in your selected services`);
            return false;
          }
          if (override.enabled === false) return false;

          // A courier the console knows about and has switched off is hidden.
          const known = settings.couriers.find((c) => c.key.toLowerCase() === courier.toLowerCase());
          if (known && !known.enabled) return false;

          // Weight rules are advisory here; Billing has already applied them.
          if (meta) {
            const weight = checkWeightEligibility(meta, totalWeight);
            if (!weight.allowed) {
              notices.push(weight.reason || `${quoted.name} is unavailable for this basket`);
              return false;
            }
          }
          return true;
        })
        .map(({ quoted, meta, override, courier }) => {
          const baseRate = override?.priceOverride ?? quoted.price;

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
            type: 'courier' as const,
            serviceId: quoted.code,
            serviceName: override?.displayName || meta?.name || quoted.name,
            courier,
            // Transit time comes from Voila, not from a hardcoded string.
            leadTime: meta?.leadTime.label || 'Delivery time confirmed at dispatch',
            leadTimeDays: meta?.leadTime.days ?? null,
            price: Number(finalRate.toFixed(2)),
            originalPrice: Number(baseRate.toFixed(2)),
          };
        })
        // Fastest first, then cheapest.
        .sort((a, b) => {
          const da = a.leadTimeDays ?? 99;
          const db = b.leadTimeDays ?? 99;
          return da !== db ? da - db : a.price - b.price;
        });

      this.unavailableNotices = notices;
      this.shippingRates = options;

      if (
        this.deliveryMode === 'courier' &&
        (!this.selectedShipping || !options.find((o) => o.serviceId === this.selectedShipping?.serviceId))
      ) {
        this.selectedShipping = options[0] || null;
      }
    } catch (error: any) {
      console.error('Rate calculation error:', error);
      this.shippingRates = [];
      this.selectedShipping = null;
      this.ratesError = error?.message || 'Could not retrieve shipping rates.';
    } finally {
      this.isLoadingRates = false;
      this.notify();
    }
  }

  public async loadPickupLocations() {
    const settings = SettingsStore.getInstance();
    if (!settings.dropShop.enabled) return;

    this.isLoadingLocations = true;
    this.dropShopErrors = {};
    this.notify();

    try {
      const enabledCouriers = settings.dropShop.enabledCouriers;

      // Query each courier in parallel; one failing courier must not hide the
      // others. A courier not registered on the Voila account returns 401 here,
      // which is recorded per courier rather than silently swallowed.
      const results = await Promise.all(
        enabledCouriers.map(async (courier) => ({
          courier,
          res: await getPickupLocations(courier, this.customer, settings.credentials),
        }))
      );

      const allLocations: PickupLocationItem[] = [];
      for (const { courier, res } of results) {
        if (res.error) {
          this.dropShopErrors[courier] = res.error;
        }
        if (res.locations && res.locations.length > 0) {
          allLocations.push(...res.locations);
        }
      }

      // Sort strictly by distance from customer address
      allLocations.sort((a, b) => a.distance - b.distance);

      const filtered = allLocations
        .filter((loc) => loc.distance <= settings.dropShop.maxRadiusMiles)
        .slice(0, settings.dropShop.maxLocations);

      this.pickupLocations = filtered.length > 0 ? filtered : allLocations.slice(0, settings.dropShop.maxLocations);

      if (this.deliveryMode === 'drop_shop' && this.pickupLocations.length > 0) {
        // If current selection is not in list, select the closest one
        if (!this.selectedPickupLocation || !this.pickupLocations.some(l => l.pickupLocation.pickupLocationCode === this.selectedPickupLocation?.pickupLocation.pickupLocationCode)) {
          this.selectPickupLocation(this.pickupLocations[0]);
        }
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
