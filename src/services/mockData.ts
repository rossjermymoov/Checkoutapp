import { CartProduct, CustomerDetails } from '../types/checkout';
import { OriginWarehouseAddress, CourierConfig } from '../types/settings';

export const DEFAULT_WAREHOUSE: OriginWarehouseAddress = {
  name: "Dispatch Desk",
  company_name: "Logistics Hub",
  phone: "01111111111",
  email: "demo@example.com",
  address_1: "2 Infirmary Street",
  address_2: "",
  city: "Leeds",
  postcode: "LS1 2JP",
  county: "West Yorkshire",
  country_iso: "GB",
  tax_id: "GB123456789",
  eori_id: "GB123456789000"
};

export const DEFAULT_CUSTOMER: CustomerDetails = {
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "Customer",
  phone: "07000 000000",
  address1: "Roebuck Lane",
  address2: "",
  city: "Birmingham",
  county: "West Midlands",
  postcode: "B66 1BY",
  country: "United Kingdom",
  countryIso: "GB",
  saveInformation: true,
  marketingConsent: true,
};

export const DEFAULT_PRODUCTS: CartProduct[] = [
  {
    id: "prod_1",
    name: "Voyager Commuter Backpack",
    variant: "Matte Charcoal / 24L Weatherproof",
    price: 89.00,
    originalPrice: 110.00,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80",
    quantity: 1,
    weightKg: 1.2,
    sku: "VOY-BP-001"
  },
  {
    id: "prod_2",
    name: "Acoustic Air True Wireless Earbuds",
    variant: "Midnight Black / Active ANC",
    price: 54.00,
    originalPrice: 65.00,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=400&q=80",
    quantity: 1,
    weightKg: 0.3,
    sku: "AIR-EAR-002"
  }
];

export const INITIAL_COURIERS: CourierConfig[] = [
  {
    key: "DPD",
    name: "DPD",
    logo: "https://app.heyvoila.io/courier-service-logos/dpd.jpg",
    enabled: true,
  },
  {
    key: "UPS",
    name: "UPS",
    logo: "https://app.heyvoila.io/courier-service-logos/ups.jpg",
    enabled: true,
  },
  {
    key: "Yodel",
    name: "Yodel",
    logo: "https://app.heyvoila.io/courier-service-logos/yodel.jpg",
    enabled: true,
  },
  {
    key: "Evri",
    name: "Evri",
    logo: "https://app.heyvoila.io/courier-service-logos/evri.jpg",
    enabled: false,
  },
  {
    key: "InPost",
    name: "InPost",
    logo: "https://app.heyvoila.io/courier-service-logos/InPost.png",
    enabled: false,
  },
  {
    key: "DHLParcelUK",
    name: "DHL Express / Parcel UK",
    logo: "https://app.heyvoila.io/courier-service-logos/dhl.jpg",
    enabled: false,
  },
  {
    key: "RoyalMail",
    name: "Royal Mail",
    logo: "https://app.heyvoila.io/courier-service-logos/royalmail.jpg",
    enabled: false,
  }
];

/*
 * Removed: MOCK_PRESETS_BY_COURIER and MOCK_BILLING_QUOTES.
 *
 * They defined service codes — UPS-STANDARD, DPD-NEXT-DAY, DPD-PICKUP,
 * UPS-ACCESS-POINT, DPD-12PM, UPS-EXPRESS-SAVER — that exist in no real Voila
 * account. They seeded the merchant console's defaults and stood in whenever a
 * live call failed, so the app looked configured and healthy while offering
 * services that could never be quoted or shipped.
 *
 * Sandbox mode now prices the merchant's own selected services instead, so a
 * fabricated service code cannot reach the cart. Do not reintroduce these.
 */
