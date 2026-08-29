import styles from './MessageBubble.module.css';
import { useAppState } from '../../context/AppStateContext.jsx';

export default function MessageBubble({ message }) {
  const { actions } = useAppState();
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? styles.userRow : styles.assistantRow}>
      <div className={isUser ? styles.userBubble : styles.assistantBubble}>
        {!isUser && <span className={styles.role}>Assistant</span>}
        <p className={styles.text}>{message.text}</p>

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
