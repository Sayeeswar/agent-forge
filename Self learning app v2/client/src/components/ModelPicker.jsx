import { useState, useRef, useEffect } from 'react';
import styles from './ModelPicker.module.css';
import { AVAILABLE_MODELS } from '../models.js';

export function ModelPicker({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className={styles.container} ref={containerRef}>
      {open && (
        <ul className={styles.menu} role="listbox">
          {AVAILABLE_MODELS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={m.id === current.id ? styles.optionActive : styles.option}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                {m.label}
                {m.id === current.id && <span className={styles.check}>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.dot} />
        <span className={styles.label}>{current.label}</span>
        <span className={styles.chevron}>{open ? '︿' : '﹀'}</span>
      </button>
    </div>
  );
}
