import { useEffect, useRef, useState } from 'react';
import styles from './PathPromptDialog.module.css';

/**
 * Collects the path of the file the review's suggestions should be applied to,
 * then runs `onSubmit(path)` (async). On `{ ok: false }` the dialog stays open
 * and shows the error; on `{ ok: true }` the caller closes it.
 */
export default function PathPromptDialog({ defaultValue = '', onClose, onSubmit }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
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
        aria-label="Apply the review's changes to a file"
        onSubmit={submit}
      >
        <h2 className={styles.title}>Apply the review’s changes</h2>
        <p className={styles.blurb}>
          The file is read and the review’s suggested fixes are folded in by the
          LLM now. You’ll see the full new version here before anything is
          written to disk.
        </p>

        <label className={styles.label}>
          Code path
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={value}
            placeholder="C:\path\to\file.py"
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>

        {busy && (
          <p className={styles.status}>
            <span className={styles.spinner} aria-hidden="true" />
            Preparing the new version…
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
            {busy ? 'Working…' : 'Preview changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
