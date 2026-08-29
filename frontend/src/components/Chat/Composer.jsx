import { useRef, useState } from 'react';
import styles from './Composer.module.css';
import PlusMenu from './PlusMenu.jsx';
import SourceDialog from './SourceDialog.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

const MAX_HEIGHT = 200;

export default function Composer() {
  const { state, actions } = useAppState();
  const [text, setText] = useState('');
  const [dialogMode, setDialogMode] = useState(null); // null | 'pr' | 'local'
  const textareaRef = useRef(null);

  const pending = state.status === 'pending';
  const canSend = text.trim().length > 0 && !pending;

  function resetHeight() {
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';
  }

  function submit() {
    if (!canSend) return;
    actions.sendMessage(text);
    setText('');
    resetHeight();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function handleChange(event) {
    setText(event.target.value);
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }

  return (
    <>
      <div className={styles.composer}>
        <PlusMenu onChoose={setDialogMode} />

        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Ask about the code or the PR…"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className={styles.send}
          disabled={!canSend}
          onClick={submit}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>

      {dialogMode && (
        <SourceDialog
          mode={dialogMode}
          onClose={() => setDialogMode(null)}
          onSubmit={(value) => {
            actions.setSource(dialogMode, value);
            setDialogMode(null);
          }}
        />
      )}
    </>
  );
}
