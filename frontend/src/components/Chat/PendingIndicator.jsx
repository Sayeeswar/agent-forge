import styles from './PendingIndicator.module.css';
import { statusMessages } from '../../data/sampleData.js';
import { useAppState } from '../../context/AppStateContext.jsx';

export default function PendingIndicator() {
  const { state } = useAppState();
  const status =
    statusMessages[state.pendingStatusIndex] ??
    statusMessages[statusMessages.length - 1];

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.status}>{status}</span>
    </div>
  );
}
