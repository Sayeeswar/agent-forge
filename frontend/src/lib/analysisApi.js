// Fetch wrapper for the Module 4 analysis endpoint on the C# backend.
// Proxied via Vite: see vite.config.js -> server.proxy '/api'.

const URL = '/api/analyze';

/**
 * POST /api/analyze -> AnalysisResult:
 *   { ok, summary, findings: [...], suggestions: [...], meta, error }
 * A transport failure becomes a synthetic ok:false result so callers can render
 * it the same way as a backend-reported failure.
 */
export async function postAnalyze({ provider, model, instruction, files, diff, history }) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ provider, model, instruction, files, diff, history }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    return {
      ok: false,
      summary: null,
      findings: null,
      suggestions: null,
      meta: null,
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      summary: null,
      findings: null,
      suggestions: null,
      meta: null,
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}
