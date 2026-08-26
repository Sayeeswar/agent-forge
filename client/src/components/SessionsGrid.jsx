import styles from './SessionsGrid.module.css';
import { SessionCard } from './SessionCard.jsx';

export function SessionsGrid({ topics, onSelectTopic }) {
  if (topics.length === 0) {
    return (
      <main className={styles.empty}>
        <p>No sessions yet — start one from the sidebar.</p>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <h2 className={styles.heading}>All Sessions</h2>
      <div className={styles.grid}>
        {topics.map((topic) => (
          <SessionCard key={topic.id} topic={topic} onClick={() => onSelectTopic(topic.id)} />
        ))}
      </div>
    </main>
  );
}
