import { useState } from 'react';
import styles from './ConnectApiButton.module.css';
import ConnectApiDialog from './ConnectApiDialog.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'openai', label: 'OpenAI' },
];

export default function ConnectApiButton() {
  const { state } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <ul className={styles.status} aria-label="API connection status">
        {PROVIDERS.map(({ id, label }) => {
          const connected = state.providers[id]?.connected;
          return (
            <li
              key={id}
              className={styles.statusItem}
              title={`${label}: ${connected ? 'connected' : 'not connected'}`}
            >
              <span
                className={connected ? styles.dotOn : styles.dotOff}
                aria-hidden="true"
              />
              <span className={styles.statusLabel}>{label}</span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className={styles.button}
        onClick={() => setDialogOpen(true)}
      >
        Connect API
      </button>

      {dialogOpen && (
        <ConnectApiDialog onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
