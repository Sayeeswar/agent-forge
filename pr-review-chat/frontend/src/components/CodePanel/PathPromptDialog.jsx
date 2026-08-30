import { useEffect, useRef, useState } from 'react';
import styles from './PathPromptDialog.module.css';

export default function PathPromptDialog({ onClose, onSubmit }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div
      className={styles.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Path to apply changes to"
        onSubmit={submit}
      >
        <h2 className={styles.title}>Where should the changes be applied?</h2>
        <p className={styles.blurb}>
          Enter the path to the file the assistant should edit. (This module only
          collects the path — applying changes is wired up later.)
        </p>

        <label className={styles.label}>
          Code path
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={value}
            placeholder="src/utils/parsePr.js"
            onChange={(event) => setValue(event.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.confirm}
            disabled={!value.trim()}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
