import styles from './CodePanel.module.css';
import CodePanelHeader from './CodePanelHeader.jsx';
import CodeView from './CodeView.jsx';
import MakeChangesButton from './MakeChangesButton.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

export default function CodePanel() {
  const { state, actions } = useAppState();

  if (!state.panel.expanded) {
    return (
      <aside className={styles.collapsed}>
        <button
          type="button"
          className={styles.reopen}
          onClick={actions.expandPanel}
          aria-label="Open code panel"
        >
          <span className={styles.reopenLabel}>Code</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={styles.panel}>
      <CodePanelHeader code={state.panel.code} onCollapse={actions.collapsePanel} />

      <div className={styles.content}>
        <CodeView code={state.panel.code} />
      </div>

      <div className={styles.footer}>
        <MakeChangesButton />
      </div>
    </aside>
  );
}
