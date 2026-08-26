import styles from './SessionCard.module.css';
import { formatRelativeDate } from '../relativeDate.js';

export function SessionCard({ topic, onClick }) {
  const date = formatRelativeDate(topic.lastActivityAt);
  const lastMessage = topic.messages[topic.messages.length - 1];
  const preview = lastMessage ? lastMessage.content : 'No messages yet';

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cardTop}>
        <span className={styles.title}>{topic.name}</span>
        {date && <span className={styles.date}>{date}</span>}
      </div>
      <div className={styles.preview}>{preview}</div>
    </button>
  );
}
