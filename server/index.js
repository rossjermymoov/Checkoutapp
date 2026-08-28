import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CRED_FILE = path.resolve(process.cwd(), 'credentials.json');

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[PROXY] ${req.method} ${req.url}`);
  next();
});

// Safe JSON parser helper
async function handleUpstreamFetch(res, targetUrl, options) {
  try {
    const response = await fetch(targetUrl, options);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn(`[PROXY] Upstream at ${targetUrl} returned non-JSON (${response.status}):`, text.substring(0, 200));
      return res.status(response.status).json({
        error: `Upstream service returned non-JSON response (HTTP ${response.status})`,
        status: response.status,
        raw: text.substring(0, 500),
        targetUrl
      });
    }
    return res.status(response.status).json(data);
  } catch (error) {
    console.error(`[PROXY ERROR] Fetch failed for ${targetUrl}:`, error);
    return res.status(500).json({ error: error.message, targetUrl });
  }
}

// Health check
app.get('/api/proxy/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Credentials persistence: GET & POST /api/proxy/credentials
app.get('/api/proxy/credentials', (req, res) => {
  if (fs.existsSync(CRED_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
      return res.json(data);
    } catch (e) {
      return res.json({});
    }
  }
  return res.json({});
});

app.post('/api/proxy/credentials', (req, res) => {
  try {
    let existing = {};
    if (fs.existsSync(CRED_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
      } catch (e) {}
    }
    const merged = { ...existing, ...req.body };
    fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2), 'utf8');
    console.log('[PROXY] Persisted credentials to disk (credentials.json)');
    return res.json({ success: true, credentials: merged });
  } catch (err) {
    console.error('[PROXY] Failed to persist credentials:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 1. Get Presets / Services for a Courier (HeyVoila / MoovParcel API)
app.get('/api/proxy/presets/:courier', async (req, res) => {
  const { courier } = req.params;
  const apiUser = req.headers['api-user'];
  const apiToken = req.headers['api-token'];

  const targetUrl = `https://app.heyvoila.io/api/couriers/v1/${encodeURIComponent(courier)}/presets`;
  console.log(`[PROXY -> HeyVoila] Fetching presets for courier "${courier}" at ${targetUrl}`);

  const authHeaders = {
    'api-user': apiUser || '',
    'api-token': apiToken || '',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
  };
  if (apiUser && apiToken) {
    authHeaders['Authorization'] = 'Basic ' + Buffer.from(`${apiUser}:${apiToken}`).toString('base64');
  }

  await handleUpstreamFetch(res, targetUrl, {
    method: 'GET',
    headers: authHeaders,
  });
});

// 2. Get Pickup Locations (HeyVoila API)
app.post('/api/proxy/pickup-locations/:courier', async (req, res) => {
  const { courier } = req.params;
  const apiUser = req.headers['api-user'];
  const apiToken = req.headers['api-token'];

  const targetUrl = `https://app.heyvoila.io/api/couriers/v1/${encodeURIComponent(courier)}/get-pickup-locations`;
  console.log(`[PROXY -> HeyVoila] Fetching pickup locations for courier "${courier}" at ${targetUrl}`);

  const pickupAuthHeaders = {
    'api-user': apiUser || '',
    'api-token': apiToken || '',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
  };
  if (apiUser && apiToken) {
    pickupAuthHeaders['Authorization'] = 'Basic ' + Buffer.from(`${apiUser}:${apiToken}`).toString('base64');
  }

  await handleUpstreamFetch(res, targetUrl, {
    method: 'POST',
    headers: pickupAuthHeaders,
    body: JSON.stringify(req.body),
  });
});

// 3. Billing API: Get Quote (POST https://production.billingapi.co.uk/api/customer-routes/get-quote)
app.post('/api/proxy/billing-quote', async (req, res) => {
  const clientName = req.headers['client_name'];
  const customerDcId = req.headers['customer_dc_id'];
  const customerKey = req.headers['customer_key'];
  const customUrl = req.headers['x-endpoint-url'];

  let targetUrl = (customUrl && customUrl !== 'undefined') ? customUrl : 'https://production.billingapi.co.uk/api/customer-routes/get-quote';
  targetUrl = targetUrl.trim().replace(/\/+$/, '');

  console.log(`[PROXY -> BillingAPI] POST quote from ${targetUrl} (client: "${clientName}", dc: "${customerDcId}")`);

  await handleUpstreamFetch(res, targetUrl, {
    method: 'POST',
    headers: {
      'client_name': clientName || 'Moov Parcel',
      'customer_dc_id': customerDcId || 'Kitloop',
      'customer_key': customerKey || 'b62e9045a42d43468840c6e07b568fcd',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
});

app.get('/api/proxy/billing-quote', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed: /api/proxy/billing-quote requires POST.',
    hint: 'The Billing API get-quote endpoint only accepts POST requests with a shipment JSON payload.'
  });
});

// 4. HeyVoila API: Get Price directly
app.post('/api/proxy/get-price/:courier', async (req, res) => {
  const { courier } = req.params;
  const apiUser = req.headers['api-user'];
  const apiToken = req.headers['api-token'];

  const targetUrl = `https://app.heyvoila.io/api/couriers/v1/${encodeURIComponent(courier)}/get-price`;
  console.log(`[PROXY -> HeyVoila] Fetching price for courier "${courier}" at ${targetUrl}`);

  await handleUpstreamFetch(res, targetUrl, {
    method: 'POST',
    headers: {
      'api-user': apiUser || '',
      'api-token': apiToken || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
});

// 5. List Couriers from HeyVoila
app.get('/api/proxy/list-couriers', async (req, res) => {
  const apiUser = req.headers['api-user'];
  const apiToken = req.headers['api-token'];

  const targetUrl = 'https://app.heyvoila.io/api/couriers/v1/list-couriers';

  await handleUpstreamFetch(res, targetUrl, {
    method: 'GET',
    headers: {
      'api-user': apiUser || '',
      'api-token': apiToken || '',
      'Content-Type': 'application/json',
    },
  });
});

app.listen(PORT, () => {
  console.log(`[CHECKOUT PROXY] Server running on http://localhost:${PORT}`);
});
