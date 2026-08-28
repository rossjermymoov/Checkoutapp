import { VoilaPreset, PickupLocationItem, BillingQuoteItem, CourierInfo } from '../types/api';
import { CartProduct, CustomerDetails } from '../types/checkout';
import { OriginWarehouseAddress, CourierConfig } from '../types/settings';

export const DEFAULT_WAREHOUSE: OriginWarehouseAddress = {
  name: "Ross Jermy",
  company_name: "Logistics Hub",
  phone: "01111111111",
  email: "ross.jermy@gmail.com",
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
  email: "ross.jermy@gmail.com",
  firstName: "Ross",
  lastName: "Jermy",
  phone: "07841 552 355",
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
    logo: "https://app.heyvoila.io/courier-service-logos/inpost.jpg",
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

export const MOCK_PRESETS_BY_COURIER: Record<string, VoilaPreset[]> = {
  DPD: [
    {
      id: 3998,
      dc_service_id: "DPD12-DROP",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Drop Off Next Day",
      lead_time: "Next Working Day (1-hr window)",
      rule_supported_countries: "GB"
    },
    {
      id: 3999,
      dc_service_id: "DPD-NEXT-DAY",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Next Day Standard",
      lead_time: "Next Day Delivery",
      rule_supported_countries: "GB"
    },
    {
      id: 4001,
      dc_service_id: "DPD-12PM",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Express Priority by 12PM",
      lead_time: "Next Day before 12:00",
      rule_supported_countries: "GB"
    },
    {
      id: 4002,
      dc_service_id: "DPD-PICKUP",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Pickup ParcelShop Collect",
      lead_time: "Next Day to Local ParcelShop",
      rule_supported_countries: "GB"
    }
  ],
  UPS: [
    {
      id: 6001,
      dc_service_id: "UPS-STANDARD",
      api_user_id: 1,
      courier: "UPS",
      name: "UPS Standard Ground",
      lead_time: "1-2 Business Days",
      rule_supported_countries: "GB"
    },
    {
      id: 6002,
      dc_service_id: "UPS-EXPRESS-SAVER",
      api_user_id: 1,
      courier: "UPS",
      name: "UPS Express Saver",
      lead_time: "Next Day by End of Day",
      rule_supported_countries: "GB"
    },
    {
      id: 6003,
      dc_service_id: "UPS-ACCESS-POINT",
      api_user_id: 1,
      courier: "UPS",
      name: "UPS Access Point Economy Collect",
      lead_time: "Next Day to Access Point",
      rule_supported_countries: "GB"
    }
  ],
  Yodel: [
    {
      id: 4501,
      dc_service_id: "YODC2C",
      api_user_id: 1,
      courier: "Yodel",
      name: "Yodel C2C Delivery",
      lead_time: "2-3 Working Days Tracked",
      rule_supported_countries: "GB"
    },
    {
      id: 4502,
      dc_service_id: "YODEL-DIRECT",
      api_user_id: 1,
      courier: "Yodel",
      name: "Yodel Direct Next Day",
      lead_time: "Next Working Day",
      rule_supported_countries: "GB"
    },
    {
      id: 4503,
      dc_service_id: "YODEL-STORE",
      api_user_id: 1,
      courier: "Yodel",
      name: "Yodel Store Collect Point",
      lead_time: "2 Working Days to Store",
      rule_supported_countries: "GB"
    }
  ]
};

export const MOCK_BILLING_QUOTES: Record<string, number> = {
  "DPD12-DROP": 5.00,
  "YODC2C": 5.00,
  "DPD-NEXT-DAY": 4.95,
  "DPD-12PM": 7.50,
  "DPD-PICKUP": 3.49,
  "UPS-STANDARD": 4.49,
  "UPS-EXPRESS-SAVER": 6.95,
  "UPS-ACCESS-POINT": 3.20,
};
