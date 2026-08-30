import styles from './App.module.css';
import TopBar from './components/TopBar/TopBar.jsx';
import ChatWindow from './components/Chat/ChatWindow.jsx';
import CodePanel from './components/CodePanel/CodePanel.jsx';
import { useAppState } from './context/AppStateContext.jsx';

export default function App() {
  const { state } = useAppState();

  const railWidth = state.panel.expanded
    ? 'var(--rail-expanded)'
    : 'var(--rail-collapsed)';

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.body} style={{ '--rail-current': railWidth }}>
        <main className={styles.chatArea}>
          <ChatWindow />
        </main>
        <CodePanel />
      </div>
    </div>
  );
}
