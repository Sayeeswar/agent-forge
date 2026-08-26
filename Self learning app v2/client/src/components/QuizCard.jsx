import { useState } from 'react';
import styles from './QuizCard.module.css';

export function QuizCard({ question, options, correctIndex, onAnswer }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(i) {
    if (selected !== null) return;
    setSelected(i);
    onAnswer(i === correctIndex, i);
  }

  return (
    <div className={styles.card}>
      <div className={styles.meta}>QUIZ</div>
      <div className={styles.question}>{question}</div>
      <div className={styles.options}>
        {options.map((option, i) => {
          let className = styles.option;
          if (selected !== null) {
            if (i === correctIndex) className = styles.optionCorrect;
            else if (i === selected) className = styles.optionWrong;
          }
          return (
            <button
              type="button"
              key={i}
              className={className}
              disabled={selected !== null}
              onClick={() => handleSelect(i)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
