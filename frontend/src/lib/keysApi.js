// Thin fetch wrappers for the Module 2 backend (C#). Proxied via Vite: see
// vite.config.js -> server.proxy '/api'. No app logic here.

const BASE = '/api/keys';

/**
 * GET /api/keys/status -> { openai: boolean, openrouter: boolean }
 * Throws on network / non-2xx so the caller can decide how to degrade.
 */
export async function getKeyStatus() {
  const res = await fetch(`${BASE}/status`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`status endpoint returned HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/keys/validate
 * Resolves to the backend's transcript object:
 *   { ok, provider, request: { url, model, prompt } | null,
 *     response: { status, replyText, body } | null, error }
 * A transport failure is turned into a synthetic ok:false result so the popup
 * can render it the same way as a provider rejection.
 */
export async function postValidateKey({ provider, key }) {
  try {
    const res = await fetch(`${BASE}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ provider, apiKey: key }),
    });

    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;

    return {
      ok: false,
      provider,
      request: null,
      response: null,
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      provider,
      request: null,
      response: null,
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}
