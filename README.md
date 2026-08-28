# Checkout Demo & Carrier Management Platform 🚚📦

A modern, high-performance checkout application with a dual-pronged architecture:
1. **Frontend Customer Checkout GUI**: A sleek checkout flow with dynamic carrier selection, live rate quoting, coupon codes, and an interactive **Drop Shop / PUDO (Pick Up Drop Off) map picker**.
2. **Backend Merchant Settings Console**: A merchant control center to configure credentials (`api-user`, `api-token`, `auth_company`, `client_name`, `customer_dc_id`, `customer_key`), curate carrier routes, sync presets live from HeyVoila, apply pricing markups, and debug live requests in an **API Traffic Inspector**.

---

## ⚡ Features

- **Dynamic Carrier Rates**: Quotes calculated dynamically via `POST https://production.billingapi.co.uk/api/customer-routes/get-quote`.
- **Live HeyVoila Presets**: Syncs carrier routing codes via `GET https://app.heyvoila.io/api/couriers/v1/{courier}/presets`.
- **Drop Shop Map & PUDO Picker**: Interactive Leaflet map with multi-carrier network support (DPD Pickup, InPost Lockers, Evri ParcelShop, UPS Access Point) via `POST https://app.heyvoila.io/api/couriers/v1/{courier}/get-pickup-locations`.
- **Merchant Customization**:
  - Rename carrier service display names & transit badges.
  - Set custom promotional tags (`Fastest`, `Best Value`, `Popular`).
  - Pricing rules: fixed surcharge (+£X.XX), percentage markup (+X%), or free delivery thresholds.
  - Search radius & location density sliders.
- **Live API Inspector**: Real-time HTTP logger showing headers, payloads, latency (ms), and response bodies.
- **Built-in Mock / Sandbox Mode**: Allows full testing without live API keys or during offline presentations.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
- **Customer Checkout UI**: `http://localhost:5173`
- **Express Proxy Server**: `http://localhost:3001`

### 3. Production Build
```bash
npm run build
```

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Leaflet & React-Leaflet.
- **Backend / Proxy**: Express.js (handling CORS, external API forwarding, header injection).
