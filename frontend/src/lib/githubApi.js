// Thin fetch wrappers for the GitHub endpoints on the C# backend (Module 3).
// Proxied via Vite: see vite.config.js -> server.proxy '/api'.

const BASE = '/api/github';

/** GET /api/github/status -> { connected: boolean, login: string | null } */
export async function getGithubStatus() {
  const res = await fetch(`${BASE}/status`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`github status endpoint returned HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/github/validate -> transcript object:
 *   { ok, request: { url } | null, response: { status, body } | null,
 *     login, scopes, error }
 * A transport failure is turned into a synthetic ok:false result.
 */
export async function postValidateGithubToken({ token }) {
  try {
    const res = await fetch(`${BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    return {
      ok: false,
      request: null,
      response: null,
      login: null,
      scopes: null,
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      request: null,
      response: null,
      login: null,
      scopes: null,
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

/**
 * GET /api/github/pr?url=... -> { ok, pr: {...} | null, error }
 * `pr` carries metadata + files[] (each with additions/deletions/patch).
 */
export async function fetchPullRequest(url) {
  try {
    const res = await fetch(`${BASE}/pr?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    return {
      ok: false,
      pr: null,
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      pr: null,
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}
