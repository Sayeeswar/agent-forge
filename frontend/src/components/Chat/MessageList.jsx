import styles from './MessageList.module.css';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList({ messages }) {
  return (
    <div className={styles.list}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
