import styles from './CodePanel.module.css';
import CodePanelHeader from './CodePanelHeader.jsx';
import CodeView from './CodeView.jsx';
import PrView from './PrView.jsx';
import SuggestionsView from './SuggestionsView.jsx';
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

  const { kind } = state.panel;

  return (
    <aside className={styles.panel}>
      <CodePanelHeader
        kind={kind}
        code={state.panel.code}
        pr={state.panel.pr}
        suggestions={state.panel.suggestions}
        onCollapse={actions.collapsePanel}
      />

      <div className={styles.content}>
        {kind === 'pr' && <PrView pr={state.panel.pr} />}
        {kind === 'suggestions' && (
          <SuggestionsView suggestions={state.panel.suggestions} />
        )}
        {kind === 'code' && <CodeView code={state.panel.code} />}
      </div>

      <div className={styles.footer}>
        <MakeChangesButton />
      </div>
    </aside>
  );
}
