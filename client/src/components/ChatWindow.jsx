import { useState } from 'react';
import styles from './ChatWindow.module.css';
import { QuizCard } from './QuizCard.jsx';

export function ChatWindow({ topic, onSendMessage, chatError, onRetry, onStartQuiz, activeQuiz, onQuizAnswer }) {
  const [draft, setDraft] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSendMessage(text);
  }

  return (
    <main className={styles.chat}>
      <header className={styles.header}>
        <h2 className={styles.title}>{topic.name}</h2>
        <button type="button" className={styles.quizButton} onClick={onStartQuiz}>
          🧠 Start Quiz
        </button>
      </header>

      <div className={styles.messages}>
        {topic.messages.length === 0 && !chatError && !activeQuiz && (
          <div className={styles.hint}>Ask me anything about {topic.name} to get started!</div>
        )}

        {topic.messages.map((message, i) => (
          <div
            key={i}
            className={message.role === 'user' ? styles.userBubble : styles.assistantBubble}
          >
            {message.content}
          </div>
        ))}

        {activeQuiz && !activeQuiz.error && (
          <QuizCard
            question={activeQuiz.question}
            options={activeQuiz.options}
            correctIndex={activeQuiz.correctIndex}
            onAnswer={(isCorrect) => onQuizAnswer(isCorrect, activeQuiz)}
          />
        )}

        {activeQuiz && activeQuiz.error && (
          <div className={styles.errorBubble}>
            Hmm, couldn't generate a quiz question.
            <button type="button" onClick={onStartQuiz}>Try again</button>
          </div>
        )}

        {chatError && (
          <div className={styles.errorBubble}>
            Hmm, couldn't reach the tutor.
            <button type="button" onClick={onRetry}>Retry</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={styles.sendButton}>Send</button>
      </form>
    </main>
  );
}
