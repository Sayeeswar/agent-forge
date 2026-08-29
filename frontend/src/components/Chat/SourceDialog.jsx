import { useEffect, useRef, useState } from 'react';
import styles from './SourceDialog.module.css';

const COPY = {
  pr: {
    title: 'Paste a GitHub PR link',
    label: 'Pull request URL',
    placeholder: 'https://github.com/owner/repo/pull/123',
    confirm: 'Fetch & add',
    hint: 'The PR is fetched from GitHub now — it is only added if that succeeds.',
    working: 'Fetching the pull request…',
  },
  local: {
    title: 'Provide a local file path',
    label: 'File path',
    placeholder: 'C:\\path\\to\\file.py',
    confirm: 'Review file',
    hint: 'The path is checked and the file is sent to the LLM now. Folders are not supported yet.',
    working: 'Checking the file and sending it to the LLM…',
  },
};

export default function SourceDialog({ mode, onClose, onSubmit }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const copy = COPY[mode];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  async function submit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(trimmed);
      if (result && result.ok === false) {
        setError(result.error || 'That did not work.');
        setBusy(false);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
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
        aria-label={copy.title}
        onSubmit={submit}
      >
        <h2 className={styles.title}>{copy.title}</h2>

        <label className={styles.label}>
          {copy.label}
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={value}
            placeholder={copy.placeholder}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>

        {copy.hint && <p className={styles.hint}>{copy.hint}</p>}

        {busy && (
          <p className={styles.status}>
            <span className={styles.spinner} aria-hidden="true" />
            {copy.working}
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.confirm}
            disabled={!value.trim() || busy}
          >
            {busy ? 'Working…' : copy.confirm}
          </button>
        </div>
      </form>
    </div>
  );
}
