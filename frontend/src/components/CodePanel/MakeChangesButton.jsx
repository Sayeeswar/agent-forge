import { useState } from 'react';
import styles from './MakeChangesButton.module.css';
import PathPromptDialog from './PathPromptDialog.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

const DISABLED_REASON = {
  pr: 'Disabled for GitHub PR sources',
  none: 'Add a local file or folder source to enable',
};

export default function MakeChangesButton() {
  const { state } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);

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
          onClose={() => setDialogOpen(false)}
          onSubmit={(path) => {
            // Module 1 stub: real path prompt + apply-to-disk logic lands in a
            // later module. For now, accepting the path just closes the dialog.
            // eslint-disable-next-line no-console
            console.info('[Module 1 stub] code path entered:', path);
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
