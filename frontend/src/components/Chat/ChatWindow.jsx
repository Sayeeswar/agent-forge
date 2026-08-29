import { useEffect, useRef } from 'react';
import styles from './ChatWindow.module.css';
import MessageList from './MessageList.jsx';
import PendingIndicator from './PendingIndicator.jsx';
import Composer from './Composer.jsx';
import SourceBar from '../SourceBar/SourceBar.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

function EmptyState() {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Review a pull request or local code</p>
      <p className={styles.emptyHint}>
        Use the <strong>+</strong> button below to paste a GitHub PR link or point
        at a local file or folder, then start the conversation.
      </p>
    </div>
  );
}

export default function ChatWindow() {
  const { state } = useAppState();
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages, state.status, state.pendingStatusIndex]);

  return (
    <div className={styles.window}>
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.column}>
          {state.messages.length === 0 ? (
            <EmptyState />
          ) : (
            <MessageList messages={state.messages} />
          )}
          {state.status === 'pending' && <PendingIndicator />}
        </div>
      </div>

      <div className={styles.composerRegion}>
        <div className={styles.column}>
          <SourceBar />
          <Composer />
        </div>
      </div>
    </div>
  );
}
