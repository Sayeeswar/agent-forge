// Fetch wrappers for the "Make changes to the code" endpoints on the C# backend.
// Proxied via Vite: see vite.config.js -> server.proxy '/api'.
//
// Two steps: preview (LLM folds the review's suggestions into the whole file,
// nothing written) then apply (the confirmed file is written to disk).

const PREVIEW_URL = '/api/code/changes/preview';
const APPLY_URL = '/api/code/changes/apply';

async function postJson(url, payload, shape) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    return {
      ...shape,
      ok: false,
      kind: 'network',
      error: `Backend returned an unexpected response (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      ...shape,
      ok: false,
      kind: 'network',
      error:
        'Could not reach the backend. Is it running on http://localhost:5180? ' +
        `(${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

/**
 * POST /api/code/changes/preview -> CodeChangePreviewResult:
 *   { ok, kind, path, language, original, proposed, summary, changed,
 *     originalHash, error }
 *   kind: ok | path-missing | not-a-file | too-large | no-key | no-suggestions
 *       | changes-failed | network
 */
export function postCodeChangesPreview({ path, provider, model, findings, suggestions }) {
  return postJson(
    PREVIEW_URL,
    { path, provider, model, findings, suggestions },
    { path: null, language: null, original: null, proposed: null, summary: null, changed: false, originalHash: null }
  );
}

/**
 * POST /api/code/changes/apply -> CodeChangeApplyResult:
 *   { ok, kind, path, backupPath, bytesWritten, error }
 *   kind: ok | path-missing | not-a-file | empty | too-large | stale
 *       | write-failed | network
 */
export function postCodeChangesApply({ path, proposed, originalHash }) {
  return postJson(
    APPLY_URL,
    { path, proposed, originalHash },
    { path: null, backupPath: null, bytesWritten: 0 }
  );
}
