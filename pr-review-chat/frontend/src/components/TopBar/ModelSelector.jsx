import { useCallback, useRef, useState } from 'react';
import styles from './ModelSelector.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';
import { useOutsideDismiss } from '../../lib/useOutsideDismiss.js';

export default function ModelSelector() {
  const { state, actions } = useAppState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useOutsideDismiss(rootRef, open, close);

  function pick(model) {
    actions.setModel(model);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.current}>{state.model}</span>
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <ul className={styles.menu} role="listbox">
          {state.models.map((model) => (
            <li key={model}>
              <button
                type="button"
                role="option"
                aria-selected={model === state.model}
                className={styles.option}
                onClick={() => pick(model)}
              >
                <span>{model}</span>
                {model === state.model && (
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
