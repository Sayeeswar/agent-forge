import styles from './CodePanelHeader.module.css';

const TITLES = {
  pr: 'Pull request',
  suggestions: 'Suggested fixes',
  code: 'Proposed code',
};

export default function CodePanelHeader({ kind, code, pr, suggestions, onCollapse }) {
  let subtitle = null;
  if (kind === 'pr' && pr) subtitle = `PR #${pr.number}`;
  else if (kind === 'suggestions' && suggestions?.length) {
    subtitle = `${suggestions.length} file${suggestions.length === 1 ? '' : 's'}`;
  } else if (kind === 'code' && code) subtitle = code.filename;

  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <span className={styles.title}>{TITLES[kind] ?? 'Code'}</span>
        {subtitle && <span className={styles.filename}>{subtitle}</span>}
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
