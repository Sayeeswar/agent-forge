import styles from './SourceBar.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

const META = {
  pr: { icon: '🔗', label: 'GitHub PR' },
  local: { icon: '📁', label: 'Local path' },
};

const ORDER = ['pr', 'local'];

export default function SourceBar() {
  const { state, actions } = useAppState();
  const entries = ORDER.filter((type) => state.sources[type]);

  if (entries.length === 0) return null;

  return (
    <div className={styles.bar}>
      <span className={styles.caption}>Source</span>

      {entries.map((type) => {
        const active = state.activeSourceType === type;
        const entry = state.sources[type];
        let display = entry.value;
        if (type === 'pr' && entry.pr?.title) display = entry.pr.title;
        else if (type === 'local') {
          display = String(entry.value).split(/[\\/]/).filter(Boolean).pop() || entry.value;
        }
        return (
          <button
            key={type}
            type="button"
            className={active ? styles.chipActive : styles.chip}
            aria-pressed={active}
            title={entry.value}
            onClick={() => actions.setActiveSource(type)}
          >
            <span aria-hidden="true">{META[type].icon}</span>
            <span className={styles.label}>{META[type].label}</span>
            <span className={styles.value}>{display}</span>
          </button>
        );
      })}

      {entries.length > 1 && (
        <span className={styles.hint}>click to switch active</span>
      )}
    </div>
  );
}
