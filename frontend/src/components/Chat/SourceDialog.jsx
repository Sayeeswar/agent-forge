import { useEffect, useRef, useState } from 'react';
import styles from './SourceDialog.module.css';

const COPY = {
  pr: {
    title: 'Paste a GitHub PR link',
    label: 'Pull request URL',
    placeholder: 'https://github.com/owner/repo/pull/123',
  },
  local: {
    title: 'Provide a local file or folder path',
    label: 'File or folder path',
    placeholder: 'C:\\path\\to\\file-or-folder',
  },
};

export default function SourceDialog({ mode, onClose, onSubmit }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const copy = COPY[mode];

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
            Add source
          </button>
        </div>
      </form>
    </div>
  );
}
