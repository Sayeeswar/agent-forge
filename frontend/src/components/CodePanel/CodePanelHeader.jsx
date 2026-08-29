import styles from './CodePanelHeader.module.css';

export default function CodePanelHeader({ code, onCollapse }) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <span className={styles.title}>Proposed code</span>
        {code && <span className={styles.filename}>{code.filename}</span>}
      </div>

      <button
        type="button"
        className={styles.collapse}
        onClick={onCollapse}
        aria-label="Collapse code panel"
      >
        →
      </button>
    </header>
  );
}
