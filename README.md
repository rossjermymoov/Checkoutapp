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

### 1. Install dependencies
```bash
npm install
```

### 2. Configure credentials
```bash
cp .env.example .env
```
Fill in `VOILA_API_USER`, `VOILA_API_TOKEN`, `VOILA_AUTH_COMPANY` and `BILLING_CUSTOMER_KEY`.
**Never commit `.env`.** Credentials live on the server only — they are not shipped to the browser.

> Voila authenticates on the `api-user` and `api-token` headers alone. No Basic Auth,
> no User-Agent spoofing. A `401 ["No api-user set in header"]` means a value is empty.

### 3. Run in development
```bash
npm run dev
```
- Checkout UI: `http://localhost:5173`
- API server: `http://localhost:3001` (Vite forwards `/api/*` to it)

### 4. Run in production
```bash
npm run serve      # builds, then serves everything from one port
```
The Express server hosts the built bundle **and** the API proxy on `PORT` (default 3001).

---

## 🌐 Deployment

The app is a single Node service — build it, then run `node server/index.js`.

**Docker / Railway / Render / Fly:**
```bash
docker build -t checkout-demo .
docker run -p 3001:3001 --env-file .env checkout-demo
```

**Host-managed (Railway, Render):** build command `npm run build`, start command `npm start`,
then set the environment variables from `.env.example` in the host's dashboard.

With `NODE_ENV=production` the merchant console can no longer write credentials to the
server, so a public demo cannot be repointed by a visitor.

---

## 🏗️ Architecture notes

- **One proxy, not two.** All upstream calls go through `server/index.js`. Vite proxies
  `/api/*` to it in development and the same file serves `dist/` in production, so dev and
  prod run identical code. Do not add a second proxy to `vite.config.ts`.
- **Credential precedence:** request header → local override file → environment variable.
  A hosted demo works with an empty browser, because the server fills in the gaps.
- **Courier response shapes differ.** Presets come back as `{ user_presets, system_presets }`,
  not an array. DPD returns nested `{ pickupLocation, distance, addressPoint }` records;
  Yodel returns flat `site_*` records. `normalisePickupLocations()` in `src/services/api.ts`
  reconciles them — extend it when adding a courier.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Leaflet & React-Leaflet.
- **Backend / Proxy**: Express.js (handling CORS, external API forwarding, header injection).
