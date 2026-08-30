import styles from './TopBar.module.css';
import ModelSelector from './ModelSelector.jsx';
import ConnectApiButton from './ConnectApiButton.jsx';

export default function TopBar() {
  return (
    <header className={styles.topBar}>
      <span className={styles.title}>PR Review Chat</span>
      <div className={styles.rightGroup}>
        <ConnectApiButton />
        <ModelSelector />
      </div>
    </header>
  );
}
