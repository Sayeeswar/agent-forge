import { useCallback, useRef, useState } from 'react';
import styles from './PlusMenu.module.css';
import { useOutsideDismiss } from '../../lib/useOutsideDismiss.js';

export default function PlusMenu({ onChoose }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useOutsideDismiss(rootRef, open, close);

  function choose(mode) {
    setOpen(false);
    onChoose(mode);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.plus}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add a review source"
        onClick={() => setOpen((v) => !v)}
      >
        +
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => choose('pr')}
          >
            <span className={styles.icon} aria-hidden="true">
              🔗
            </span>
            <span className={styles.body}>
              <span className={styles.itemTitle}>Paste a GitHub PR link</span>
              <span className={styles.itemSub}>Review a pull request</span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => choose('local')}
          >
            <span className={styles.icon} aria-hidden="true">
              📁
            </span>
            <span className={styles.body}>
              <span className={styles.itemTitle}>
                Provide a local file or folder path
              </span>
              <span className={styles.itemSub}>Review code on disk</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
