import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Runtime-editable credential overrides live OUTSIDE the repo tree by default so
// they can never be committed again. Set CREDENTIALS_FILE to relocate.
const CRED_FILE = process.env.CREDENTIALS_FILE
  ? path.resolve(process.env.CREDENTIALS_FILE)
  : path.join(ROOT, '.credentials.local.json');

// Whether the merchant console may write credentials back to the server. This is
// fine on a developer's laptop and dangerous on a public demo, where any visitor
// could otherwise repoint the proxy at their own endpoint.
const ALLOW_CREDENTIAL_WRITES = process.env.ALLOW_CREDENTIAL_WRITES
  ? process.env.ALLOW_CREDENTIAL_WRITES === 'true'
  : !IS_PRODUCTION;

const VOILA_BASE = process.env.VOILA_BASE_URL || 'https://app.heyvoila.io/api/couriers/v1';
const BILLING_DEFAULT_URL =
  process.env.BILLING_ENDPOINT_URL || 'https://production.billingapi.co.uk/api/customer-routes/get-quote';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    console.log(`[PROXY] ${req.method} ${req.url}`);
  }
  next();
});

// ---------------------------------------------------------------------------
// Admin gate
// ---------------------------------------------------------------------------
// ADMIN_PASSWORD protects the console and the link store. It is a shared
// password for a demonstrator, not a user system: there are no accounts, no
// reset flow and no lockout. It stops a customer who has a demo link from
// wandering into the carrier settings; it is not protection against someone
// determined. With no ADMIN_PASSWORD set the console stays open, and the server
// says so at startup.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_ENABLED = ADMIN_PASSWORD.length > 0;

function isAdmin(req) {
  if (!ADMIN_ENABLED) return true;
  const supplied = String(req.headers['x-admin-key'] || '');
  if (supplied.length !== ADMIN_PASSWORD.length) return false;
  // Constant-time compare so the response time cannot be used to guess it.
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(ADMIN_PASSWORD));
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return false;
  res.status(401).json({ error: 'Not authorised.' });
  return true;
}

// ---------------------------------------------------------------------------
// Customer link store
// ---------------------------------------------------------------------------
// Links are random tokens, created from the console and saved here so they can
// be listed and revoked later.
//
// PERSISTENCE. LINKS_FILE decides where they live. On a host with an ephemeral
// filesystem — Railway without a volume, most container platforms — a file in
// the container is wiped on every redeploy, taking the links with it. Attach a
// volume and point LINKS_FILE at it.

const LINKS_FILE = process.env.LINKS_FILE
  ? path.resolve(process.env.LINKS_FILE)
  : path.join(ROOT, '.customer-links.json');

const LINKS_PERSISTENT = Boolean(process.env.LINKS_FILE);

// Published configuration lives beside the links, so one volume covers both.
const SETTINGS_FILE = process.env.SETTINGS_FILE
  ? path.resolve(process.env.SETTINGS_FILE)
  : path.join(path.dirname(LINKS_FILE), '.published-settings.json');

function readPublishedSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    console.warn('[SETTINGS] Could not read published settings:', e.message);
    return null;
  }
}

function readLinks() {
  try {
    if (!fs.existsSync(LINKS_FILE)) return {};
    const parsed = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[LINKS] Could not read link store:', e.message);
    return {};
  }
}

function writeLinks(links) {
  try {
    fs.mkdirSync(path.dirname(LINKS_FILE), { recursive: true });
    fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[LINKS] Could not write link store:', e.message);
    return false;
  }
}

/** 20 characters of a-z0-9 — about 103 bits, not guessable or enumerable. */
function newToken() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// ---------------------------------------------------------------------------
// Tenants (per-customer demo links)
// ---------------------------------------------------------------------------
// A customer link needs NO configuration. /c/<slug> works immediately: the name
// is derived from the slug and the shared CHECKOUT_SETTINGS_JSON is used, so
// adding a customer means sending them a URL and nothing else.
//
// CHECKOUT_TENANTS_JSON is optional, only for the exceptions — a display name
// that does not fall out of the slug ("acme-uk" -> "Acme UK"), or a customer
// quoted against their own carrier account:
//
//   { "acme": { "name": "ACME (UK) Ltd",
//               "credentials": { "billingCustomerDcId": "AcmeDC", ... } } }
//
// The credentials block NEVER leaves this process.

/** "acme-retail" -> "Acme Retail". Good enough for a demonstrator's header. */
function nameFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function readTenants() {
  const raw = process.env.CHECKOUT_TENANTS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[PROXY] CHECKOUT_TENANTS_JSON is not valid JSON, ignoring it.');
    return {};
  }
}

function tenantFromRequest(req) {
  const slug = String(req.headers['x-tenant'] || '').toLowerCase().trim();
  if (!slug) return null;
  const tenants = readTenants();
  return tenants[slug] || null;
}

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------
// Precedence: request header (merchant console) -> local override file -> env var.
// Secrets therefore never have to reach the browser for a hosted demo to work.

function readOverrides() {
  if (!fs.existsSync(CRED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
  } catch (e) {
    console.warn('[PROXY] Could not parse credential override file, ignoring it.');
    return {};
  }
}

function pick(headerValue, overrideValue, envValue) {
  const candidates = [headerValue, overrideValue, envValue];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '' && value !== 'undefined') {
      return value.trim();
    }
  }
  return '';
}

function resolveVoilaCredentials(req) {
  const o = readOverrides();
  const t = tenantFromRequest(req)?.credentials || {};
  return {
    apiUser: pick(req.headers['api-user'], t.voilaApiUser || o.voilaApiUser, process.env.VOILA_API_USER),
    apiToken: pick(req.headers['api-token'], t.voilaApiToken || o.voilaApiToken, process.env.VOILA_API_TOKEN),
    authCompany: pick(
      req.headers['auth-company'],
      t.voilaAuthCompany || o.voilaAuthCompany,
      process.env.VOILA_AUTH_COMPANY
    ),
  };
}

function resolveBillingCredentials(req) {
  const o = readOverrides();
  const t = tenantFromRequest(req)?.credentials || {};
  return {
    clientName: pick(req.headers['client_name'], t.billingClientName || o.billingClientName, process.env.BILLING_CLIENT_NAME),
    customerDcId: pick(
      req.headers['customer_dc_id'],
      t.billingCustomerDcId || o.billingCustomerDcId,
      process.env.BILLING_CUSTOMER_DC_ID
    ),
    customerKey: pick(req.headers['customer_key'], t.billingCustomerKey || o.billingCustomerKey, process.env.BILLING_CUSTOMER_KEY),
    endpointUrl:
      pick(req.headers['x-endpoint-url'], o.billingEndpointUrl, process.env.BILLING_ENDPOINT_URL) ||
      BILLING_DEFAULT_URL,
  };
}

function voilaHeaders({ apiUser, apiToken }) {
  // Voila authenticates on these two headers alone. Nothing else is required —
  // no Basic Auth, no browser User-Agent. A 401 here means a field is empty.
  return {
    'api-user': apiUser,
    'api-token': apiToken,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function missingVoilaCredentials(res, { apiUser, apiToken }) {
  if (apiUser && apiToken) return false;
  res.status(400).json({
    error: 'Voila credentials are not configured.',
    detail:
      'Set VOILA_API_USER and VOILA_API_TOKEN in the environment, or enter them in the merchant settings console.',
    missing: [!apiUser && 'api-user', !apiToken && 'api-token'].filter(Boolean),
  });
  return true;
}

async function forward(res, targetUrl, options) {
  const startedAt = Date.now();
  try {
    const response = await fetch(targetUrl, options);
    const text = await response.text();
    const durationMs = Date.now() - startedAt;

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn(`[PROXY] Non-JSON from ${targetUrl} (HTTP ${response.status})`);
      return res.status(response.status).json({
        error: `Upstream returned a non-JSON response (HTTP ${response.status})`,
        status: response.status,
        raw: text.substring(0, 500),
        targetUrl,
        durationMs,
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, error.message);
    return res.status(502).json({ error: error.message, targetUrl });
  }
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.get('/api/proxy/health', (req, res) => {
  const voila = resolveVoilaCredentials(req);
  const billing = resolveBillingCredentials(req);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    adminRequired: ADMIN_ENABLED,
    linksPersistent: LINKS_PERSISTENT,
    credentials: {
      voila: Boolean(voila.apiUser && voila.apiToken),
      billing: Boolean(billing.customerKey),
    },
  });
});

// Credentials: never return secrets to the browser, only whether they are set.
app.get('/api/proxy/credentials', (req, res) => {
  const o = readOverrides();
  res.json({
    billingClientName: pick('', o.billingClientName, process.env.BILLING_CLIENT_NAME),
    billingCustomerDcId: pick('', o.billingCustomerDcId, process.env.BILLING_CUSTOMER_DC_ID),
    billingEndpointUrl: pick('', o.billingEndpointUrl, process.env.BILLING_ENDPOINT_URL) || BILLING_DEFAULT_URL,
    voilaAuthCompany: pick('', o.voilaAuthCompany, process.env.VOILA_AUTH_COMPANY),
    voilaApiUser: pick('', o.voilaApiUser, process.env.VOILA_API_USER),
    // Secrets are reported as configured-or-not, never echoed back.
    hasVoilaToken: Boolean(pick('', o.voilaApiToken, process.env.VOILA_API_TOKEN)),
    hasBillingKey: Boolean(pick('', o.billingCustomerKey, process.env.BILLING_CUSTOMER_KEY)),
    serverManagedCredentials: !ALLOW_CREDENTIAL_WRITES,
  });
});

app.post('/api/proxy/credentials', (req, res) => {
  if (!ALLOW_CREDENTIAL_WRITES) {
    return res.status(403).json({
      error: 'Credentials are managed by the server in this environment.',
      detail: 'Set them as environment variables on the host rather than through the console.',
    });
  }
  try {
    const merged = { ...readOverrides(), ...req.body };
    fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`[PROXY] Saved credential overrides to ${CRED_FILE}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PROXY] Failed to persist credentials:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Shared merchant configuration for a hosted demo.
 *
 * Service selections, pricing rules and courier settings otherwise live in the
 * browser's localStorage, which means they exist only on the machine that
 * created them. A visitor opening the deployed URL — or the same person in a
 * private window — gets an unconfigured app.
 *
 * CHECKOUT_SETTINGS_JSON lets the host carry that configuration. Export it from
 * the console on a configured machine and set it as an environment variable.
 * Credentials are never part of it; those stay in their own variables.
 */
app.get('/api/proxy/settings', (req, res) => {
  // Published from the console first; the environment variable is the seed for
  // a fresh deployment and the fallback if nothing has been published yet.
  const published = readPublishedSettings();
  if (published) {
    const settings = { ...published.settings };
    delete settings.credentials;
    return res.json({ configured: true, settings, publishedAt: published.publishedAt, source: 'published' });
  }

  const raw = process.env.CHECKOUT_SETTINGS_JSON;
  if (!raw) return res.json({ configured: false });
  try {
    const parsed = JSON.parse(raw);
    delete parsed.credentials;
    return res.json({ configured: true, settings: parsed, source: 'environment' });
  } catch (e) {
    console.warn('[PROXY] CHECKOUT_SETTINGS_JSON is not valid JSON, ignoring it.');
    return res.json({ configured: false, error: 'CHECKOUT_SETTINGS_JSON is not valid JSON' });
  }
});

/**
 * Publish the console's current configuration to every customer link. Replaces
 * the export-and-paste cycle, which produced a snapshot that silently went
 * stale the moment anything changed.
 */
app.post('/api/proxy/settings', (req, res) => {
  if (requireAdmin(req, res)) return;

  const settings = req.body?.settings;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'No settings supplied.' });
  }
  // Credentials are never part of published configuration.
  delete settings.credentials;

  const payload = { publishedAt: new Date().toISOString(), settings };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.error('[SETTINGS] Could not publish:', e.message);
    return res.status(500).json({ error: 'Could not save. Check the SETTINGS_FILE location is writable.' });
  }

  console.log(`[SETTINGS] Published ${(settings.services || []).length} services to ${SETTINGS_FILE}`);
  res.json({ published: true, publishedAt: payload.publishedAt, persistent: LINKS_PERSISTENT });
});

app.get('/api/proxy/tenants/:slug', (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return res.status(404).json({ found: false });

  // Only links that were actually issued resolve. A guessed or edited URL gets
  // the same 404 as a made-up one, so customer links cannot be enumerated.
  const saved = readLinks()[slug];
  const configured = readTenants()[slug];
  if (!saved && !configured) return res.status(404).json({ found: false });

  const tenant = configured || {};

  // Same precedence as GET /api/proxy/settings: a tenant's own configuration,
  // then what the console published, then the environment seed. Reading the
  // environment directly here would leave customer links on a stale snapshot
  // while the root URL showed the current one.
  let settings = tenant.settings;
  if (!settings) {
    const published = readPublishedSettings();
    if (published) {
      settings = published.settings;
    } else {
      try {
        settings = process.env.CHECKOUT_SETTINGS_JSON ? JSON.parse(process.env.CHECKOUT_SETTINGS_JSON) : {};
      } catch (e) {
        settings = {};
      }
    }
  }
  settings = { ...settings };
  // Belt and braces: strip anything credential-shaped before it leaves.
  delete settings.credentials;

  return res.json({
    found: true,
    brand: {
      slug,
      name: tenant.name || saved?.company || nameFromSlug(slug),
      tagline: tenant.tagline || saved?.tagline,
    },
    settings,
  });
});

/** Saved customer links. Admin only — this is the list of live demo URLs. */
app.get('/api/proxy/links', (req, res) => {
  if (requireAdmin(req, res)) return;
  const links = readLinks();
  const configured = Object.entries(readTenants()).map(([slug, t]) => ({
    token: slug,
    company: t?.name || slug,
    createdAt: null,
    fromEnvironment: true,
  }));
  res.json({
    persistent: LINKS_PERSISTENT,
    links: [
      ...Object.entries(links)
        .map(([token, l]) => ({ token, company: l.company, createdAt: l.createdAt, fromEnvironment: false }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      ...configured,
    ],
  });
});

app.post('/api/proxy/links', (req, res) => {
  if (requireAdmin(req, res)) return;
  const company = String(req.body?.company || '').trim();
  if (!company) return res.status(400).json({ error: 'A company name is required.' });

  const links = readLinks();
  const token = newToken();
  links[token] = { company, createdAt: new Date().toISOString() };

  if (!writeLinks(links)) {
    return res.status(500).json({ error: 'Could not save the link. Check the LINKS_FILE location is writable.' });
  }
  res.json({ token, company, persistent: LINKS_PERSISTENT });
});

app.delete('/api/proxy/links/:token', (req, res) => {
  if (requireAdmin(req, res)) return;
  const token = String(req.params.token || '').toLowerCase();
  const links = readLinks();
  if (!links[token]) return res.status(404).json({ error: 'No such link.' });
  delete links[token];
  if (!writeLinks(links)) return res.status(500).json({ error: 'Could not update the link store.' });
  res.json({ revoked: token });
});

app.post('/api/proxy/admin/check', (req, res) => {
  res.json({ ok: isAdmin(req) });
});

// 1. Courier presets
app.get('/api/proxy/presets/:courier', async (req, res) => {
  const creds = resolveVoilaCredentials(req);
  if (missingVoilaCredentials(res, creds)) return;

  const targetUrl = `${VOILA_BASE}/${encodeURIComponent(req.params.courier)}/presets`;
  await forward(res, targetUrl, { method: 'GET', headers: voilaHeaders(creds) });
});

// 2. Pickup locations
app.post('/api/proxy/pickup-locations/:courier', async (req, res) => {
  const creds = resolveVoilaCredentials(req);
  if (missingVoilaCredentials(res, creds)) return;

  // Fill in auth_company server-side if the client did not supply one.
  const body = { ...req.body };
  if (!body.auth_company && creds.authCompany) {
    body.auth_company = creds.authCompany;
  }

  const targetUrl = `${VOILA_BASE}/${encodeURIComponent(req.params.courier)}/get-pickup-locations`;
  await forward(res, targetUrl, {
    method: 'POST',
    headers: voilaHeaders(creds),
    body: JSON.stringify(body),
  });
});

// 3. Direct courier price
app.post('/api/proxy/get-price/:courier', async (req, res) => {
  const creds = resolveVoilaCredentials(req);
  if (missingVoilaCredentials(res, creds)) return;

  const targetUrl = `${VOILA_BASE}/${encodeURIComponent(req.params.courier)}/get-price`;
  await forward(res, targetUrl, {
    method: 'POST',
    headers: voilaHeaders(creds),
    body: JSON.stringify(req.body),
  });
});

// 4. Available couriers
app.get('/api/proxy/list-couriers', async (req, res) => {
  const creds = resolveVoilaCredentials(req);
  if (missingVoilaCredentials(res, creds)) return;

  await forward(res, `${VOILA_BASE}/list-couriers`, { method: 'GET', headers: voilaHeaders(creds) });
});

// 5. Billing API quote
app.post('/api/proxy/billing-quote', async (req, res) => {
  const creds = resolveBillingCredentials(req);
  if (!creds.customerKey) {
    return res.status(400).json({
      error: 'Billing API credentials are not configured.',
      detail: 'Set BILLING_CUSTOMER_KEY in the environment, or enter it in the merchant settings console.',
    });
  }

  const targetUrl = creds.endpointUrl.replace(/\/+$/, '');
  const body = { ...req.body };
  const voila = resolveVoilaCredentials(req);
  if (!body.auth_company && voila.authCompany) {
    body.auth_company = voila.authCompany;
  }

  await forward(res, targetUrl, {
    method: 'POST',
    headers: {
      client_name: creds.clientName,
      customer_dc_id: creds.customerDcId,
      customer_key: creds.customerKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
});

app.get('/api/proxy/billing-quote', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed: /api/proxy/billing-quote requires POST.',
    hint: 'The Billing API get-quote endpoint only accepts POST requests with a shipment JSON payload.',
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Proxy route not found: ${req.method} ${req.originalUrl}` });
});

// ---------------------------------------------------------------------------
// Static hosting of the built app (production)
// ---------------------------------------------------------------------------

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log('[CHECKOUT] Serving built frontend from dist/');
} else {
  app.get('/', (req, res) => {
    res.status(503).send(
      '<h1>Frontend not built</h1><p>Run <code>npm run build</code>, or use <code>npm run dev</code> for the Vite dev server.</p>'
    );
  });
}

app.listen(PORT, () => {
  console.log(`[CHECKOUT] Server listening on http://localhost:${PORT}`);
  console.log(`[CHECKOUT] Voila credentials: ${process.env.VOILA_API_USER ? 'from environment' : 'not set in environment'}`);
  console.log(`[CHECKOUT] Credential writes: ${ALLOW_CREDENTIAL_WRITES ? 'enabled' : 'disabled (server-managed)'}`);
  console.log(`[CHECKOUT] Console: ${ADMIN_ENABLED ? 'password protected' : 'OPEN — set ADMIN_PASSWORD to protect it'}`);
  console.log(
    `[CHECKOUT] Customer links: ${LINKS_FILE}${
      LINKS_PERSISTENT ? '' : ' (NOT persistent — set LINKS_FILE to a mounted volume or links are lost on redeploy)'
    }`
  );
});
