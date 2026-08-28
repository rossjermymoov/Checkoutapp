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
  address1: "9 Mellor Meadows",
  address2: "Whittington",
  city: "Oswestry",
  county: "Shropshire",
  postcode: "SY11 4FN",
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
    key: "Evri",
    name: "Evri",
    logo: "https://app.heyvoila.io/courier-service-logos/evri.jpg",
    enabled: true,
  },
  {
    key: "UPS",
    name: "UPS",
    logo: "https://app.heyvoila.io/courier-service-logos/ups.jpg",
    enabled: true,
  },
  {
    key: "DHLParcelUK",
    name: "DHL Express / Parcel UK",
    logo: "https://app.heyvoila.io/courier-service-logos/dhl.jpg",
    enabled: true,
  },
  {
    key: "RoyalMail",
    name: "Royal Mail",
    logo: "https://app.heyvoila.io/courier-service-logos/royalmail.jpg",
    enabled: true,
  },
  {
    key: "InPost",
    name: "InPost Lockers",
    logo: "https://app.heyvoila.io/courier-service-logos/inpost.jpg",
    enabled: true,
  }
];

export const MOCK_PRESETS_BY_COURIER: Record<string, VoilaPreset[]> = {
  DPD: [
    {
      id: 3998,
      dc_service_id: "DPD-NEXT-DAY",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Next Day Standard",
      lead_time: "Next Day (1-hour delivery window)",
      rule_supported_countries: "GB"
    },
    {
      id: 3999,
      dc_service_id: "DPD-12PM",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Priority by 12:00 PM",
      lead_time: "Next Day before 12:00",
      rule_supported_countries: "GB"
    },
    {
      id: 4001,
      dc_service_id: "DPD-SATURDAY",
      api_user_id: 1,
      courier: "DPD",
      name: "DPD Saturday Guaranteed",
      lead_time: "Guaranteed Saturday delivery",
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
  Evri: [
    {
      id: 5001,
      dc_service_id: "EVRI-STANDARD",
      api_user_id: 1,
      courier: "Evri",
      name: "Evri Standard Tracked",
      lead_time: "2-4 Business Days",
      rule_supported_countries: "GB"
    },
    {
      id: 5002,
      dc_service_id: "EVRI-NEXT-DAY",
      api_user_id: 1,
      courier: "Evri",
      name: "Evri Next Day Delivery",
      lead_time: "Next Working Day",
      rule_supported_countries: "GB"
    },
    {
      id: 5003,
      dc_service_id: "EVRI-PARCELSHOP",
      api_user_id: 1,
      courier: "Evri",
      name: "Evri ParcelShop / Locker Collection",
      lead_time: "2 Business Days",
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
  DHLParcelUK: [
    {
      id: 7001,
      dc_service_id: "DHL-NEXT-DAY",
      api_user_id: 1,
      courier: "DHLParcelUK",
      name: "DHL Express Next Day UK",
      lead_time: "Next Day by 6pm",
      rule_supported_countries: "GB"
    },
    {
      id: 7002,
      dc_service_id: "DHL-EXPRESS-12",
      api_user_id: 1,
      courier: "DHLParcelUK",
      name: "DHL Express Pre-12:00",
      lead_time: "Next Morning before 12:00",
      rule_supported_countries: "GB"
    }
  ],
  RoyalMail: [
    {
      id: 8001,
      dc_service_id: "RM-TRACKED-24",
      api_user_id: 1,
      courier: "RoyalMail",
      name: "Royal Mail Tracked 24",
      lead_time: "1 Working Day",
      rule_supported_countries: "GB"
    },
    {
      id: 8002,
      dc_service_id: "RM-TRACKED-48",
      api_user_id: 1,
      courier: "RoyalMail",
      name: "Royal Mail Tracked 48",
      lead_time: "2-3 Working Days",
      rule_supported_countries: "GB"
    }
  ],
  InPost: [
    {
      id: 9001,
      dc_service_id: "INPOST-LOCKER-24",
      api_user_id: 1,
      courier: "InPost",
      name: "InPost 24/7 Automated Locker",
      lead_time: "Next Day 24/7 Access",
      rule_supported_countries: "GB"
    }
  ]
};

export const MOCK_PICKUP_LOCATIONS: PickupLocationItem[] = [
  {
    pickupLocation: {
      pickupLocationCode: "DPD-GB17223",
      address: {
        organisation: "Oldbury Express & Newsagents",
        street: "Unit 10-1 West Cross Shopping Centre",
        town: "Smethwick",
        county: "West Midlands",
        postcode: "B66 1JG",
        countryCode: "GB"
      },
      pickupLocationType: "200",
      shortName: "Oldbury Express (DPD Pickup)",
      depotDescription: "Dudley Port SuperHub",
      openLate: true,
      openSaturday: true,
      openSunday: true,
      courier: "DPD",
      pickupLocationAvailability: {
        pickupLocationOpenWindow: [
          { pickupLocationOpenWindowDay: 1, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "22:00" },
          { pickupLocationOpenWindowDay: 2, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "22:00" },
          { pickupLocationOpenWindowDay: 3, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "22:00" },
          { pickupLocationOpenWindowDay: 4, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "22:00" },
          { pickupLocationOpenWindowDay: 5, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "22:00" },
          { pickupLocationOpenWindowDay: 6, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 7, pickupLocationOpenWindowStartTime: "09:00", pickupLocationOpenWindowEndTime: "20:00" }
        ]
      }
    },
    distance: 0.35,
    addressPoint: {
      latitude: 52.505581,
      longitude: -1.978301
    }
  },
  {
    pickupLocation: {
      pickupLocationCode: "INPOST-LOCK-4882",
      address: {
        organisation: "Tesco Extra Locker Station 24/7",
        street: "New Square, Reform Street",
        town: "West Bromwich",
        county: "West Midlands",
        postcode: "B70 7PP",
        countryCode: "GB"
      },
      pickupLocationType: "Locker",
      shortName: "InPost 24/7 Locker - Tesco Extra",
      depotDescription: "Automated Self-Service Locker",
      openLate: true,
      openSaturday: true,
      openSunday: true,
      courier: "InPost",
      pickupLocationAvailability: {
        pickupLocationOpenWindow: [
          { pickupLocationOpenWindowDay: 1, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 2, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 3, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 4, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 5, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 6, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" },
          { pickupLocationOpenWindowDay: 7, pickupLocationOpenWindowStartTime: "00:00", pickupLocationOpenWindowEndTime: "23:59" }
        ]
      }
    },
    distance: 0.72,
    addressPoint: {
      latitude: 52.518210,
      longitude: -1.996120
    }
  },
  {
    pickupLocation: {
      pickupLocationCode: "EVRI-PS-8921",
      address: {
        organisation: "Spar Convenience & Post",
        street: "42 High Street",
        town: "Oswestry",
        county: "Shropshire",
        postcode: "SY11 1SP",
        countryCode: "GB"
      },
      pickupLocationType: "200",
      shortName: "Spar Convenience (Evri ParcelShop)",
      depotDescription: "Shrewsbury Hub",
      openLate: true,
      openSaturday: true,
      openSunday: true,
      courier: "Evri",
      pickupLocationAvailability: {
        pickupLocationOpenWindow: [
          { pickupLocationOpenWindowDay: 1, pickupLocationOpenWindowStartTime: "06:30", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 2, pickupLocationOpenWindowStartTime: "06:30", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 3, pickupLocationOpenWindowStartTime: "06:30", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 4, pickupLocationOpenWindowStartTime: "06:30", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 5, pickupLocationOpenWindowStartTime: "06:30", pickupLocationOpenWindowEndTime: "21:00" },
          { pickupLocationOpenWindowDay: 6, pickupLocationOpenWindowStartTime: "07:00", pickupLocationOpenWindowEndTime: "20:00" },
          { pickupLocationOpenWindowDay: 7, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "19:00" }
        ]
      }
    },
    distance: 1.15,
    addressPoint: {
      latitude: 52.859600,
      longitude: -3.056000
    }
  },
  {
    pickupLocation: {
      pickupLocationCode: "UPS-AP-9923",
      address: {
        organisation: "Whittington Village Stores",
        street: "Station Road",
        town: "Whittington, Oswestry",
        county: "Shropshire",
        postcode: "SY11 4NF",
        countryCode: "GB"
      },
      pickupLocationType: "200",
      shortName: "Whittington Stores (UPS Access Point)",
      depotDescription: "Chester Sorting Center",
      openLate: false,
      openSaturday: true,
      openSunday: false,
      courier: "UPS",
      pickupLocationAvailability: {
        pickupLocationOpenWindow: [
          { pickupLocationOpenWindowDay: 1, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "18:00" },
          { pickupLocationOpenWindowDay: 2, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "18:00" },
          { pickupLocationOpenWindowDay: 3, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "18:00" },
          { pickupLocationOpenWindowDay: 4, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "18:00" },
          { pickupLocationOpenWindowDay: 5, pickupLocationOpenWindowStartTime: "08:00", pickupLocationOpenWindowEndTime: "18:00" },
          { pickupLocationOpenWindowDay: 6, pickupLocationOpenWindowStartTime: "09:00", pickupLocationOpenWindowEndTime: "16:00" }
        ]
      }
    },
    distance: 0.48,
    addressPoint: {
      latitude: 52.873200,
      longitude: -3.001400
    }
  }
];

export const MOCK_BILLING_QUOTES: Record<string, number> = {
  "DPD-NEXT-DAY": 4.95,
  "DPD-12PM": 7.50,
  "DPD-SATURDAY": 9.99,
  "DPD-PICKUP": 3.49,
  "EVRI-STANDARD": 2.99,
  "EVRI-NEXT-DAY": 3.99,
  "EVRI-PARCELSHOP": 2.49,
  "UPS-STANDARD": 4.49,
  "UPS-EXPRESS-SAVER": 6.95,
  "UPS-ACCESS-POINT": 3.20,
  "DHL-NEXT-DAY": 5.75,
  "DHL-EXPRESS-12": 8.50,
  "RM-TRACKED-24": 4.25,
  "RM-TRACKED-48": 3.10,
  "INPOST-LOCKER-24": 2.75
};
