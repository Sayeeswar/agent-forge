import styles from './SuggestionsView.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

export default function SuggestionsView({ suggestions }) {
  const { state, actions } = useAppState();
  const list = suggestions ?? [];
  const hasPr = !!(state.panel.pr ?? state.sources.pr?.pr);

  return (
    <div className={styles.wrap}>
      {hasPr && (
        <button type="button" className={styles.back} onClick={actions.showPr}>
          ← Back to PR
        </button>
      )}

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No code suggestions</p>
          <p className={styles.emptyHint}>
            The analysis did not return any before/after code. See the chat for
            the findings.
          </p>
        </div>
      ) : (
        list.map((s, i) => (
          <figure key={`${s.file}-${i}`} className={styles.item}>
            <figcaption className={styles.caption}>
              <span className={styles.file}>{s.file || 'suggestion'}</span>
              {s.language && <span className={styles.lang}>{s.language}</span>}
            </figcaption>

            {s.before ? (
              <div className={styles.block}>
                <span className={styles.blockLabel}>Before</span>
                <pre className={styles.pre}>
                  <code>{s.before}</code>
                </pre>
              </div>
            ) : (
              <p className={styles.note}>New code — nothing to replace.</p>
            )}

            <div className={styles.block}>
              <span className={styles.blockLabel}>After</span>
              {s.after ? (
                <pre className={styles.pre}>
                  <code>{s.after}</code>
                </pre>
              ) : (
                <p className={styles.note}>
                  Suggested removal — no replacement code.
                </p>
              )}
            </div>

            {s.note && <p className={styles.note}>{s.note}</p>}
          </figure>
        ))
      )}
    </div>
  );
}
