/**
 * Console password gate.
 *
 * A shared password for a demonstrator, not a user system — no accounts, no
 * reset, no lockout. It keeps a customer holding a demo link out of the carrier
 * settings. It is not protection against someone determined, and the key is
 * held in sessionStorage, so treat it accordingly.
 */

const KEY = 'checkout_admin_key';

export function getAdminKey(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}

export function setAdminKey(key: string | null) {
  try {
    if (key === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, key);
  } catch (e) {
    /* private mode with storage disabled — the session simply won't persist */
  }
}

export function adminHeaders(): Record<string, string> {
  const key = getAdminKey();
  return key ? { 'x-admin-key': key } : {};
}

export async function isAdminRequired(): Promise<boolean> {
  try {
    const res = await fetch('/api/proxy/health');
    if (!res.ok) return false;
    const body = await res.json();
    return Boolean(body.adminRequired);
  } catch (e) {
    return false;
  }
}

export async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('/api/proxy/admin/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    });
    if (!res.ok) return false;
    const body = await res.json();
    return Boolean(body.ok);
  } catch (e) {
    return false;
  }
}
