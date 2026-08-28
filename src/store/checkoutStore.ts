import { CartProduct, CustomerDetails, SelectedShippingOption, OrderConfirmation } from '../types/checkout';
import { PickupLocationItem, QuotedService } from '../types/api';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMER } from '../services/mockData';
import { getBillingQuote, getPickupLocations } from '../services/api';
import {
  getServiceCatalogue,
  normaliseCourier,
  checkWeightEligibility,
  removeDominatedOptions,
} from '../services/serviceCatalogue';
import { applyPricingRules, AppliedRule } from '../services/pricingRules';
import { SettingsStore } from './settingsStore';

const CHECKOUT_STORAGE_KEY = 'checkout_demo_state_v2';

export class CheckoutStore {
  private static instance: CheckoutStore;
  private subscribers = new Set<() => void>();

  public cart: CartProduct[] = DEFAULT_PRODUCTS;
  public customer: CustomerDetails = DEFAULT_CUSTOMER;
  public deliveryMode: 'courier' | 'drop_shop' = 'courier';
  public selectedShipping: SelectedShippingOption | null = null;
  /** Quoted doorstep services. */
  public shippingRates: SelectedShippingOption[] = [];
  /** Quoted services the merchant classified as pickup-point deliveries. */
  public dropShopRates: SelectedShippingOption[] = [];
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
  /** Which pricing rules fired for each service, so a price is explainable. */
  public appliedPricingRules: Record<string, AppliedRule[]> = {};
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

  /**
   * The quoted pickup-point service that will carry to this courier's shops.
   * Returns null when the courier has no priced drop-off service, in which case
   * its locations cannot be sold.
   */
  public getDropShopServiceForCourier(courier?: string): SelectedShippingOption | null {
    const key = normaliseCourier(courier).toLowerCase();
    if (!key) return null;

    // Cheapest, not first-found. A courier can have several pickup-point
    // services quoted at once — DPD Drop Off Next Day and DPD Drop Off Two Day,
    // for instance. Taking the first in array order would let the "pay as
    // little as £X" banner advertise one price while selection charged another.
    const matches = this.dropShopRates.filter((r) => normaliseCourier(r.courier).toLowerCase() === key);
    if (matches.length === 0) return null;
    return matches.reduce((cheapest, r) => (r.price < cheapest.price ? r : cheapest));
  }

  /** The cheapest quoted pickup-point service across all couriers. */
  public getCheapestDropShopService(): SelectedShippingOption | null {
    if (this.dropShopRates.length === 0) return null;
    return this.dropShopRates.reduce((cheapest, r) => (r.price < cheapest.price ? r : cheapest));
  }

  public selectPickupLocation(location: PickupLocationItem) {
    this.selectedPickupLocation = location;
    const org = location.pickupLocation.address?.organisation || location.pickupLocation.shortName || 'Drop Shop';

    // Price comes from the carrier's own quote for the drop-off service, not a
    // flat constant. There was previously a hardcoded £2.49 here, applied to
    // every courier and every destination regardless of what was quoted.
    const service = this.getDropShopServiceForCourier(location.pickupLocation.courier);
    if (!service) {
      this.selectedShipping = null;
      this.ratesError = `No priced pickup-point service is available for ${
        location.pickupLocation.courier || 'this courier'
      }. Select that service in Settings → Service Catalogue and mark it as a pickup point.`;
      this.notify();
      return;
    }

    // service.price has already been through the rule pipeline in
    // calculateRates, so it is not re-applied here.
    const basePrice = service.price;
    const finalPrice = this.couponCode === 'FREESHIP' ? 0 : basePrice;

    this.selectedShipping = {
      type: 'drop_shop',
      serviceId: service.serviceId,
      serviceName: `${service.serviceName} — ${org}`,
      courier: service.courier,
      leadTime: service.leadTime,
      leadTimeDays: service.leadTimeDays,
      isDropShop: true,
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
    this.appliedPricingRules = {};
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
          const isDropShop = Boolean(override?.isDropShop);

          // The merchant's rule pipeline transforms the carrier's quote.
          // With no rules configured the quote passes through untouched.
          const { price: ruledPrice, applied } = applyPricingRules(baseRate, settings.pricingRules, {
            courier,
            serviceId: quoted.code,
            countryIso: this.customer.countryIso || 'GB',
            orderValue: this.getSubtotal(),
            weightKg: totalWeight,
            isDropShop,
          });

          const finalRate = this.couponCode === 'FREESHIP' ? 0 : ruledPrice;
          this.appliedPricingRules[quoted.code] = applied;

          return {
            type: 'courier' as const,
            serviceId: quoted.code,
            serviceName: override?.displayName || meta?.name || quoted.name,
            courier,
            // Transit time comes from Voila, but the merchant's own wording wins
            // where they have set it. Voila reports DPD Saturday and DPD Sunday
            // as "Next Day", which is true of the transit but wrong to show a
            // customer, and there was no way to correct it: the console had the
            // field and this ignored it.
            leadTime: override?.leadTime?.trim() || meta?.leadTime.label || 'Delivery time confirmed at dispatch',
            leadTimeDays: meta?.leadTime.days ?? null,
            isDropShop,
            isPremium: Boolean(override?.isPremium),
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

      // Hide a service when another from the SAME courier is both at least as
      // fast and at least as cheap — DPD Next Day at £5.00 makes DPD 48 at
      // £5.00 a pointless choice. Applied after pricing rules, so the
      // comparison uses the prices the customer would actually pay.
      let finalOptions = options;
      if (settings.hideDominatedServices) {
        const { kept, hidden } = removeDominatedOptions(options);
        finalOptions = kept;
        hidden.forEach(({ option, dominatedBy }) => {
          const sameCost = option.price === dominatedBy.price;
          notices.push(
            `${option.serviceName} hidden — ${dominatedBy.serviceName} is ${
              sameCost ? 'the same price' : `£${(option.price - dominatedBy.price).toFixed(2)} cheaper`
            } and arrives sooner`
          );
        });
      }

      // The reverse diagnostic: services the merchant selected that the Billing
      // API did not price for this address. Without this, a merchant who has
      // ticked twenty services and sees two has nothing to tell them why.
      if (!isSandbox) {
        const quotedCodes = new Set(quotedServices.map((q) => q.code));
        settings.services
          .filter((svc) => svc.enabled && !quotedCodes.has(svc.dc_service_id))
          .forEach((svc) => {
            notices.push(
              `${svc.displayName || svc.dc_service_id} is selected but was not quoted for ${
                this.customer.postcode || 'this address'
              } — the Billing API has no price configured for it, or its rules exclude this destination`
            );
          });
      }

      this.unavailableNotices = notices;

      // Doorstep and pickup-point services are the same quoted services split by
      // the merchant's own classification. A pickup point is not a product in
      // its own right — it is a destination for one of these services, and it
      // is priced at that service's quoted rate.
      this.shippingRates = finalOptions.filter((o) => !o.isDropShop);
      this.dropShopRates = finalOptions.filter((o) => o.isDropShop);

      if (
        this.deliveryMode === 'courier' &&
        (!this.selectedShipping ||
          !this.shippingRates.find((o) => o.serviceId === this.selectedShipping?.serviceId))
      ) {
        this.selectedShipping = this.shippingRates[0] || null;
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

    // Pickup points are priced from quoted services, so rates must exist first.
    if (this.shippingRates.length === 0 && this.dropShopRates.length === 0 && !this.isLoadingRates) {
      await this.calculateRates();
    }

    this.isLoadingLocations = true;
    this.dropShopErrors = {};
    this.notify();

    try {
      // Only query couriers that actually have a priced pickup-point service.
      // Showing shops we cannot price is what led to the flat £2.49.
      const sellable = new Set(this.dropShopRates.map((r) => normaliseCourier(r.courier)));
      const enabledCouriers = settings.dropShop.enabledCouriers.filter((c) =>
        sellable.has(normaliseCourier(c))
      );

      if (enabledCouriers.length === 0) {
        this.pickupLocations = [];
        this.isLoadingLocations = false;
        this.notify();
        return;
      }

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

  /**
   * Returns null when no shipping has been selected. There is deliberately no
   * default: inventing a "DPD Standard Delivery £4.95" line put a service on a
   * real order confirmation that nobody had quoted or chosen.
   */
  public placeOrder(paymentMethod: string = 'Credit Card'): OrderConfirmation | null {
    if (!this.selectedShipping) {
      this.ratesError = 'Choose a delivery option before placing the order.';
      this.notify();
      return null;
    }

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
      shipping: this.selectedShipping,
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
