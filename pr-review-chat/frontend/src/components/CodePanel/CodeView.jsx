import styles from './CodeView.module.css';

export default function CodeView({ code }) {
  if (!code) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No code proposed yet</p>
        <p className={styles.emptyHint}>
          When the assistant proposes a change, the new version of the code shows
          up here.
        </p>
      </div>
    );
  }

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{code.filename}</figcaption>
      <pre className={styles.pre}>
        <code>{code.content}</code>
      </pre>
    </figure>
  );
}
