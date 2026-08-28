import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite plugin to handle API proxying directly on the Vite dev server port (avoiding extra port conflicts)
function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/proxy')) {
          return next();
        }

        const urlPath = req.url.split('?')[0];
        console.log(`[VITE PROXY] ${req.method} ${urlPath}`);

        // Helper to read JSON request body
        const readBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (e) {
                resolve({});
              }
            });
          });
        };

        const sendJsonResponse = (statusCode: number, data: any) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          return res.end();
        }

        try {
          // 1. Health check
          if (urlPath === '/api/proxy/health') {
            return sendJsonResponse(200, { status: 'ok', server: 'vite-integrated-proxy' });
          }

          // 2. BillingAPI Get Quote: POST https://production.billingapi.co.uk/api/customer-routes/get-quote
          if (urlPath === '/api/proxy/billing-quote') {
            if (req.method !== 'POST') {
              return sendJsonResponse(405, {
                error: `Method Not Allowed: /api/proxy/billing-quote requires POST (received ${req.method}).`,
                hint: 'The Billing API get-quote endpoint only accepts POST requests with a shipment JSON payload.'
              });
            }

            const body = await readBody();
            const clientName = (req.headers['client_name'] as string) || 'Moov Parcel';
            const customerDcId = (req.headers['customer_dc_id'] as string) || 'Kitloop';
            const customerKey = (req.headers['customer_key'] as string) || 'b62e9045a42d43468840c6e07b568fcd';
            let targetUrl = (req.headers['x-endpoint-url'] as string) || 'https://production.billingapi.co.uk/api/customer-routes/get-quote';
            if (targetUrl === 'undefined' || !targetUrl.trim()) {
              targetUrl = 'https://production.billingapi.co.uk/api/customer-routes/get-quote';
            }
            targetUrl = targetUrl.trim().replace(/\/+$/, '');

            console.log(`[VITE PROXY -> BillingAPI] POST ${targetUrl} (client: "${clientName}", dc: "${customerDcId}")`);

            const upstreamRes = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'client_name': clientName,
                'customer_dc_id': customerDcId,
                'customer_key': customerKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });

            const text = await upstreamRes.text();
            let parsedData: any;
            try {
              parsedData = JSON.parse(text);
            } catch (err) {
              console.warn(`[VITE PROXY] BillingAPI returned non-JSON (${upstreamRes.status}):`, text.substring(0, 200));
              return sendJsonResponse(upstreamRes.status, {
                error: `Upstream BillingAPI returned non-JSON response (HTTP ${upstreamRes.status})`,
                status: upstreamRes.status,
                raw: text.substring(0, 300)
              });
            }

            return sendJsonResponse(upstreamRes.status, parsedData);
          }

          // 3. HeyVoila / MoovParcel Presets: /api/proxy/presets/:courier
          if (urlPath.startsWith('/api/proxy/presets/') && req.method === 'GET') {
            const courier = decodeURIComponent(urlPath.replace('/api/proxy/presets/', ''));
            const apiUser = (req.headers['api-user'] as string) || '';
            const apiToken = (req.headers['api-token'] as string) || (req.headers['api-key'] as string) || '';

            const targetUrl = `https://app.heyvoila.io/api/couriers/v1/${encodeURIComponent(courier)}/presets`;
            console.log(`[VITE PROXY -> HeyVoila] GET presets for "${courier}" at ${targetUrl} (api-user: "${apiUser}", token: "${apiToken ? apiToken.substring(0, 4) + '...' : ''}")`);

            const authHeaders: Record<string, string> = {
              'api-user': apiUser,
              'api-token': apiToken,
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Content-Type': 'application/json',
            };
            if (apiUser && apiToken) {
              authHeaders['Authorization'] = 'Basic ' + Buffer.from(`${apiUser}:${apiToken}`).toString('base64');
            }

            const upstreamRes = await fetch(targetUrl, {
              method: 'GET',
              headers: authHeaders,
            });

            const text = await upstreamRes.text();
            console.log(`[VITE PROXY -> HeyVoila Response] Status: ${upstreamRes.status}, Content-Type: ${upstreamRes.headers.get('content-type')}, Body:`, text.substring(0, 300));

            let parsedData: any;
            try {
              parsedData = JSON.parse(text);
            } catch (err) {
              console.warn(`[VITE PROXY] Presets returned non-JSON (${upstreamRes.status}):`, text.substring(0, 200));
              return sendJsonResponse(upstreamRes.status, {
                error: `Upstream Presets returned non-JSON response (HTTP ${upstreamRes.status})`,
                status: upstreamRes.status,
                raw: text.substring(0, 300)
              });
            }

            return sendJsonResponse(upstreamRes.status, parsedData);
          }

          // 4. HeyVoila Pickup Locations: /api/proxy/pickup-locations/:courier
          if (urlPath.startsWith('/api/proxy/pickup-locations/') && req.method === 'POST') {
            const courier = decodeURIComponent(urlPath.replace('/api/proxy/pickup-locations/', ''));
            const apiUser = (req.headers['api-user'] as string) || '';
            const apiToken = (req.headers['api-token'] as string) || '';
            const body = await readBody();

            const targetUrl = `https://app.heyvoila.io/api/couriers/v1/${encodeURIComponent(courier)}/get-pickup-locations`;
            console.log(`[VITE PROXY -> HeyVoila] Fetching pickup locations for "${courier}" at ${targetUrl}`);

            const pickupAuthHeaders: Record<string, string> = {
              'api-user': apiUser,
              'api-token': apiToken,
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Content-Type': 'application/json',
            };
            if (apiUser && apiToken) {
              pickupAuthHeaders['Authorization'] = 'Basic ' + Buffer.from(`${apiUser}:${apiToken}`).toString('base64');
            }

            const upstreamRes = await fetch(targetUrl, {
              method: 'POST',
              headers: pickupAuthHeaders,
              body: JSON.stringify(body),
            });

            const text = await upstreamRes.text();
            let parsedData: any;
            try {
              parsedData = JSON.parse(text);
            } catch (err) {
              console.warn(`[VITE PROXY] HeyVoila pickup locations returned non-JSON (${upstreamRes.status}):`, text.substring(0, 200));
              return sendJsonResponse(upstreamRes.status, {
                error: `Upstream HeyVoila returned non-JSON response (HTTP ${upstreamRes.status})`,
                raw: text.substring(0, 300)
              });
            }

            return sendJsonResponse(upstreamRes.status, parsedData);
          }

          // 5. Credentials persistence: /api/proxy/credentials
          if (urlPath === '/api/proxy/credentials') {
            const fs = await import('fs');
            const path = await import('path');
            const credFilePath = path.resolve(process.cwd(), 'credentials.json');

            if (req.method === 'GET') {
              if (fs.existsSync(credFilePath)) {
                try {
                  const data = JSON.parse(fs.readFileSync(credFilePath, 'utf8'));
                  return sendJsonResponse(200, data);
                } catch (e) {
                  return sendJsonResponse(200, {});
                }
              }
              return sendJsonResponse(200, {});
            }

            if (req.method === 'POST') {
              const body = await readBody();
              try {
                let existing = {};
                if (fs.existsSync(credFilePath)) {
                  try {
                    existing = JSON.parse(fs.readFileSync(credFilePath, 'utf8'));
                  } catch (e) {}
                }
                const merged = { ...existing, ...body };
                fs.writeFileSync(credFilePath, JSON.stringify(merged, null, 2), 'utf8');
                console.log('[VITE PROXY] Persisted credentials to disk (credentials.json)');
                return sendJsonResponse(200, { success: true, credentials: merged });
              } catch (err: any) {
                return sendJsonResponse(500, { error: err.message });
              }
            }
          }

          // Fallback if route not matched
          return sendJsonResponse(404, { error: `Proxy route not found: ${urlPath}` });
        } catch (error: any) {
          console.error('[VITE PROXY ERROR]', error);
          return sendJsonResponse(500, {
            error: error.message || 'Internal proxy error',
            stack: error.stack
          });
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
