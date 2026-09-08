// Fetch wrapper for the Module 5 file-path getter on the C# backend.
// Proxied via Vite: see vite.config.js -> server.proxy '/api'.

const URL = '/api/file/review';

/**
 * POST /api/file/review -> FileReviewResult:
 *   { ok, kind, message, analysis, error }
 *   kind: path-missing | not-a-file | too-large | no-key | review-failed
 *       | ipynb-redirect | unsupported | review
 * Transport failure becomes a synthetic ok:false result.
 */
export async function postFileReview({ path, provider, model }) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ path, provider, model }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    return {
      ok: false,
      kind: 'network',
      message: null,
      analysis: null,
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      kind: 'network',
      message: null,
      analysis: null,
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}
