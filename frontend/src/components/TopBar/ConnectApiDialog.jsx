import { useEffect, useRef, useState } from 'react';
import styles from './ConnectApiDialog.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-…' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
];

export default function ConnectApiDialog({ onClose }) {
  const { state, actions } = useAppState();

  // Provider selection is app-level state (it also drives the model dropdown),
  // so read it from the store rather than keeping a local copy.
  const provider = state.provider;
  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | validating | success | error
  const [result, setResult] = useState(null);

  const inputRef = useRef(null);
  const meta = PROVIDERS.find((p) => p.id === provider);
  const connected = !!state.providers[provider]?.connected;
  const busy = phase === 'validating';

  useEffect(() => {
    inputRef.current?.focus();
  }, [provider]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  function pickProvider(id) {
    if (busy || id === provider) return;
    actions.setProvider(id);
    setKey('');
    setRevealed(false);
    setPhase('idle');
    setResult(null);
  }

  async function submit(event) {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed || busy) return;

    setPhase('validating');
    setResult(null);

    const r = await actions.validateKey(provider, trimmed);
    setResult(r);

    if (r.ok) {
      setPhase('success');
      window.setTimeout(onClose, 900);
    } else {
      setPhase('error');
    }
  }

  return (
    <div
      className={styles.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Connect an LLM API key"
        onSubmit={submit}
      >
        <h2 className={styles.title}>Connect API</h2>
        <p className={styles.blurb}>
          Enter your own key for a provider. It is validated with a real request and
          only saved if that request succeeds.
        </p>

        <div
          className={styles.providerRow}
          role="radiogroup"
          aria-label="Provider"
        >
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === provider}
              className={p.id === provider ? styles.segOn : styles.seg}
              onClick={() => pickProvider(p.id)}
              disabled={busy}
            >
              {p.label}
              {state.providers[p.id]?.connected && (
                <span className={styles.segDot} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {connected && (
          <p className={styles.connectedNote}>
            {meta.label} is already connected. Enter a new key to replace it.
          </p>
        )}

        <label className={styles.label}>
          {meta.label} API key
          <span className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              type={revealed ? 'text' : 'password'}
              value={key}
              placeholder={meta.placeholder}
              autoComplete="off"
              spellCheck="false"
              disabled={busy}
              onChange={(event) => setKey(event.target.value)}
            />
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setRevealed((v) => !v)}
              disabled={busy}
              aria-label={revealed ? 'Hide key' : 'Show key'}
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>

        {(busy || result) && (
          <div className={styles.transcript} role="status" aria-live="polite">
            <Transcript phase={phase} provider={meta.label} result={result} />
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            {phase === 'success' ? 'Close' : 'Cancel'}
          </button>
          <button
            type="submit"
            className={styles.confirm}
            disabled={!key.trim() || busy || phase === 'success'}
          >
            {busy ? 'Validating…' : 'Validate & connect'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Transcript({ phase, provider, result }) {
  const req = result?.request;
  const res = result?.response;
  const attempts = result?.attempts ?? [];

  return (
    <>
      <div className={styles.tRow}>
        <span className={styles.tHead}>Request</span>
        {phase === 'validating' && !result ? (
          <span className={styles.tBody}>
            <span className={styles.spinner} aria-hidden="true" />
            Sending a test prompt to {provider}…
          </span>
        ) : req ? (
          <span className={styles.tBody}>
            POST {req.url}
            {'\n'}model: {req.model}
            {'\n'}prompt: “{req.prompt}”
          </span>
        ) : (
          <span className={styles.tBody}>— (never sent)</span>
        )}
      </div>

      {result && (
        <div className={styles.tRow}>
          <span className={styles.tHead}>Response</span>
          {result.ok ? (
            <span className={styles.tBody}>
              {res?.status ?? 200} · reply: “{res?.replyText}”
            </span>
          ) : (
            <span className={styles.tBodyError}>
              {res?.status ? `HTTP ${res.status}` : 'no response'}
              {res?.body ? `\n${res.body}` : ''}
              {result.error ? `\n\n${result.error}` : ''}
            </span>
          )}
        </div>
      )}

      {attempts.length > 1 && (
        <div className={styles.tRow}>
          <span className={styles.tHead}>Models tried</span>
          <span className={styles.tBody}>
            {attempts
              .map(
                (a) =>
                  `${a.ok ? '✓' : '✗'} ${a.model} — ` +
                  `${a.status ? `HTTP ${a.status}` : 'no response'}` +
                  `${a.error ? ` (${a.error})` : ''}`
              )
              .join('\n')}
          </span>
        </div>
      )}

      {phase === 'success' && (
        <p className={styles.successLine}>✓ {provider} connected — saving…</p>
      )}
    </>
  );
}
