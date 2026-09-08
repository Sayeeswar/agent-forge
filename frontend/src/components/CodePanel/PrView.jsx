import styles from './PrView.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

function stateLabel(pr) {
  if (pr.merged) return 'merged';
  return pr.state || 'open';
}

export default function PrView({ pr }) {
  const { state, actions } = useAppState();
  const pending = state.status === 'pending';
  const providerConnected = !!state.providers[state.provider]?.connected;

  if (!pr) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No pull request loaded</p>
        <p className={styles.emptyHint}>
          Use the “+” button in the composer to paste a GitHub PR link.
        </p>
      </div>
    );
  }

  const badge = stateLabel(pr);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <span className={styles.number}>#{pr.number}</span>
          <span className={`${styles.badge} ${styles[`badge_${badge}`] || ''}`}>
            {badge}
          </span>
        </div>
        <h2 className={styles.title}>{pr.title}</h2>

        <dl className={styles.meta}>
          <div className={styles.metaItem}>
            <dt>Author</dt>
            <dd>{pr.author}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Branches</dt>
            <dd className={styles.mono}>
              {pr.baseRef} <span aria-hidden="true">←</span> {pr.headRef}
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Changes</dt>
            <dd>
              <span className={styles.add}>+{pr.additions}</span>{' '}
              <span className={styles.del}>−{pr.deletions}</span> ·{' '}
              {pr.changedFiles} file{pr.changedFiles === 1 ? '' : 's'}
            </dd>
          </div>
        </dl>

        {pr.htmlUrl && (
          <a
            className={styles.link}
            href={pr.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            View on GitHub ↗
          </a>
        )}

        <button
          type="button"
          className={styles.analyze}
          onClick={actions.analyzePr}
          disabled={pending || !providerConnected}
        >
          {pending ? 'Analyzing…' : 'Analyse this PR'}
        </button>
        {!providerConnected && (
          <p className={styles.analyzeNote}>
            Connect a {state.provider} key (Connect API) to run analysis.
          </p>
        )}
      </header>

      {pr.body && (
        <details className={styles.description}>
          <summary className={styles.summary}>Description</summary>
          <pre className={styles.descriptionBody}>{pr.body}</pre>
        </details>
      )}

      <div className={styles.files}>
        {pr.files.map((file) => (
          <details key={file.filename} className={styles.file} open>
            <summary className={styles.summary}>
              <span className={styles.fileName}>{file.filename}</span>
              <span className={styles.fileCounts}>
                <span className={styles.add}>+{file.additions}</span>{' '}
                <span className={styles.del}>−{file.deletions}</span>
              </span>
            </summary>
            {file.patch ? (
              <pre className={styles.patch}>
                <code>{file.patch}</code>
              </pre>
            ) : (
              <p className={styles.noPatch}>
                No patch available (binary, renamed, or too large).
              </p>
            )}
          </details>
        ))}

        {pr.files.length === 0 && (
          <p className={styles.noPatch}>This pull request changes no files.</p>
        )}
      </div>
    </div>
  );
}
