import styles from './EmptyState.module.css';

export function EmptyState({ onOpenWizard }) {
  return (
    <main className={styles.empty}>
      <div className={styles.emoji}>🎓</div>
      <h2>Pick a session, or start a new one</h2>
      <p className={styles.subtitle}>Your AI tutor is ready whenever you are.</p>
      <button type="button" className={styles.button} onClick={onOpenWizard}>
        + New Session
      </button>
    </main>
  );
}
