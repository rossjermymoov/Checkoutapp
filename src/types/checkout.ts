// Customer Checkout Types

export interface CartProduct {
  id: string;
  name: string;
  variant: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  weightKg: number;
  sku: string;
}

export interface CustomerDetails {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  countryIso: string;
  saveInformation: boolean;
  marketingConsent: boolean;
}

export interface SelectedShippingOption {
  type: 'courier' | 'drop_shop';
  serviceId: string;
  serviceName: string;
  courier: string;
  leadTime: string;
  /** Working days in transit, from the Voila preset. null when not published. */
  leadTimeDays?: number | null;
  price: number;
  originalPrice: number;
  dropShopDetails?: {
    code: string;
    organisation: string;
    street: string;
    town: string;
    postcode: string;
    distance: number;
    hours: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface OrderConfirmation {
  orderNumber: string;
  createdAt: string;
  customer: CustomerDetails;
  items: CartProduct[];
  shipping: SelectedShippingOption;
  subtotal: number;
  discount: number;
  shippingPrice: number;
  tax: number;
  total: number;
  paymentMethod: string;
}
