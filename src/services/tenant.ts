/**
 * Per-customer demo links.
 *
 * A tenant is a named configuration served from the host. Opening /c/<slug>
 * loads that customer's services, pricing rules and branding, and presents the
 * checkout on its own — no carrier settings, no console.
 *
 * SCOPE OF THE HIDING. This removes the console from the customer's view; it is
 * not an access control boundary. The API routes stay reachable to anyone who
 * knows they exist. What it does guarantee is that no secret is reachable:
 * credentials are resolved server-side and /api/proxy/credentials reports only
 * whether they are set. Treat a customer link as "not shown", not "secured", and
 * do not put anything in a tenant record you would mind that customer reading.
 */

export interface TenantBrand {
  slug: string;
  /** Company name, shown as "<name> Demo" in the header. */
  name: string;
  tagline?: string;
}

export interface TenantResponse {
  found: boolean;
  brand?: TenantBrand;
  settings?: any;
}

/** Turn a company name into a URL-safe slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** The tenant slug in the current URL, or null for the full admin view. */
export function currentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/c\/([a-z0-9-]+)\/?$/i);
  return match ? match[1].toLowerCase() : null;
}

export function customerLinkFor(slug: string): string {
  if (typeof window === 'undefined') return `/c/${slug}`;
  return `${window.location.origin}/c/${slug}`;
}

export async function fetchTenant(slug: string): Promise<TenantResponse> {
  try {
    const res = await fetch(`/api/proxy/tenants/${encodeURIComponent(slug)}`);
    if (!res.ok) return { found: false };
    return await res.json();
  } catch (e) {
    return { found: false };
  }
}
