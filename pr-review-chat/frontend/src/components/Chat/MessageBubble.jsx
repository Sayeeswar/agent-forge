import styles from './MessageBubble.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

const SEVERITY_CLASS = {
  High: 'sevHigh',
  Medium: 'sevMedium',
  Low: 'sevLow',
};

const SEVERITY_ORDER = ['High', 'Medium', 'Low'];

function Finding({ finding }) {
  const sevClass = SEVERITY_CLASS[finding.severity] || 'sevMedium';
  const where = [finding.file, finding.line != null ? `line ${finding.line}` : null]
    .filter(Boolean)
    .join(' · ');

  const explanation =
    finding.description ||
    finding.whatIsWrong ||
    finding.explanation ||
    finding.message ||
    '';

  const why =
    finding.whyItIsWrong ||
    finding.why_it_is_wrong ||
    finding.reason ||
    '';

  return (
    <li className={styles.finding}>
      <div className={styles.findingHead}>
        <span className={`${styles.sev} ${styles[sevClass]}`}>
          {finding.severity}
        </span>
        <span className={styles.findingTitle}>{finding.title}</span>
        {finding.warning && <span className={styles.warnTag}>warning</span>}
      </div>

      {explanation && (
        <p className={styles.findingLine}>
          <span className={styles.findingLabel}>Explanation</span>
          {explanation}
        </p>
      )}
      {why && (
        <p className={styles.findingLine}>
          <span className={styles.findingLabel}>Why</span>
          {why}
        </p>
      )}
      <p className={styles.findingMeta}>
        {where}
        {finding.category ? ` · ${finding.category}` : ''}
      </p>
    </li>
  );
}

export default function MessageBubble({ message }) {
  const { actions } = useAppState();
  const isUser = message.role === 'user';
  const findings = message.findings ?? [];
  const suggestions = message.suggestions ?? [];

  const groupedFindings = SEVERITY_ORDER.reduce((acc, level) => {
    acc[level] = findings.filter((finding) => finding.severity === level);
    return acc;
  }, {});

  return (
    <div className={isUser ? styles.userRow : styles.assistantRow}>
      <div className={isUser ? styles.userBubble : styles.assistantBubble}>
        {!isUser && <span className={styles.role}>Assistant</span>}
        <p className={styles.text}>{message.text}</p>

        {!isUser && findings.length > 0 && (
          <div className={styles.findingsSection}>
            {SEVERITY_ORDER.map((level) => {
              const items = groupedFindings[level] ?? [];

              if (items.length === 0) {
                return null;
              }

              return (
                <div key={level} className={styles.severityGroup}>
                  <h4 className={`${styles.severityHeader} ${styles[SEVERITY_CLASS[level]]}`}>
                    {level}
                  </h4>

                  <ul className={styles.findings}>
                    {items.map((f, i) => (
                      <Finding key={`${f.file}-${f.line}-${i}`} finding={f} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {!isUser && suggestions.length > 0 && (
          <button
            type="button"
            className={styles.codeRef}
            onClick={() => actions.showSuggestions(suggestions)}
          >
            <span className={styles.codeRefIcon} aria-hidden="true">
              ⌘
            </span>
            {suggestions.length} suggested fix
            {suggestions.length === 1 ? '' : 'es'}
            <span className={styles.codeRefArrow} aria-hidden="true">
              →
            </span>
          </button>
        )}

        {!isUser && message.code && (
          <button
            type="button"
            className={styles.codeRef}
            onClick={actions.expandPanel}
          >
            <span className={styles.codeRefIcon} aria-hidden="true">
              ⌘
            </span>
            Proposed change to <code>{message.code.filename}</code>
            <span className={styles.codeRefArrow} aria-hidden="true">
              →
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
