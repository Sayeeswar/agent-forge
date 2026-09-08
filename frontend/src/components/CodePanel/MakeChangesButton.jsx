import { useState } from 'react';
import styles from './MakeChangesButton.module.css';
import PathPromptDialog from './PathPromptDialog.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

const DISABLED_REASON = {
  pr: 'Disabled for GitHub PR sources',
  none: 'Add a local file or folder source to enable',
};

export default function MakeChangesButton() {
  const { state, actions } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [writing, setWriting] = useState(false);

  const pending = state.pendingCodeChange;

  // Confirmation step: a full-file rewrite is on screen, waiting to be written.
  if (pending) {
    return (
      <div className={styles.wrap}>
        <p className={styles.pendingNote}>
          Proposed rewrite of <code>{pending.path}</code> is shown on the right.
          Nothing is written until you confirm.
        </p>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.secondary}
            disabled={writing}
            onClick={() => actions.discardCodeChanges()}
          >
            Discard
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={writing}
            onClick={async () => {
              setWriting(true);
              await actions.writeCodeChanges();
              setWriting(false);
            }}
          >
            {writing ? 'Writing…' : 'Write to disk'}
          </button>
        </div>
      </div>
    );
  }

  const enabled = state.activeSourceType === 'local';
  const reason = enabled
    ? undefined
    : state.activeSourceType === 'pr'
      ? DISABLED_REASON.pr
      : DISABLED_REASON.none;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        disabled={!enabled}
        title={reason}
        onClick={() => setDialogOpen(true)}
      >
        Make changes to the code
      </button>

      {!enabled && <p className={styles.note}>{reason}</p>}

      {dialogOpen && (
        <PathPromptDialog
          defaultValue={state.sources.local?.value ?? ''}
          onClose={() => setDialogOpen(false)}
          onSubmit={(path) => actions.previewCodeChanges(path)}
        />
      )}
    </div>
  );
}
