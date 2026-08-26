import styles from './PlaceholderPanel.module.css';

export function PlaceholderPanel({ title }) {
  return (
    <main className={styles.panel}>
      <div className={styles.emoji}>🚧</div>
      <h2>{title}</h2>
      <p className={styles.subtitle}>Coming soon.</p>
    </main>
  );
}
