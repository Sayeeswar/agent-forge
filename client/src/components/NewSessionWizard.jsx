import { useState, useEffect } from 'react';
import styles from './NewSessionWizard.module.css';
import { fetchDegreeSuggestions } from '../api.js';
import {
  LEARNER_TYPES,
  UNIVERSITY_LEVELS,
  SCHOOL_CLASSES,
  FALLBACK_DEGREES,
  getWizardSteps,
  learnerTypeLabel,
  levelLabel,
  profileSummary,
} from '../learnerOptions.js';

export function NewSessionWizard({ savedProfile, onComplete, onCancel }) {
  const hasSavedProfile = Boolean(savedProfile && savedProfile.learnerType);

  const [mode, setMode] = useState(hasSavedProfile ? 'entry' : 'wizard');
  const [confirming, setConfirming] = useState(new Set());

  const [learnerType, setLearnerType] = useState(savedProfile?.learnerType || '');
  const [level, setLevel] = useState(savedProfile?.level || '');
  const [university, setUniversity] = useState(savedProfile?.university || '');
  const [degree, setDegree] = useState(savedProfile?.degree || '');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [material, setMaterial] = useState('');

  const [stepIndex, setStepIndex] = useState(0);
  const [degreeSuggestions, setDegreeSuggestions] = useState([]);
  const [degreeLoading, setDegreeLoading] = useState(false);

  const steps = getWizardSteps(learnerType);
  const currentStepId = steps[stepIndex];

  useEffect(() => {
    if (currentStepId !== 'degree' || confirming.has('degree')) return;
    if (!university.trim()) {
      setDegreeSuggestions([]);
      return;
    }
    let cancelled = false;
    setDegreeLoading(true);
    fetchDegreeSuggestions({ university, level })
      .then((list) => {
        if (!cancelled) setDegreeSuggestions(Array.isArray(list) && list.length ? list : FALLBACK_DEGREES);
      })
      .catch(() => {
        if (!cancelled) setDegreeSuggestions(FALLBACK_DEGREES);
      })
      .finally(() => {
        if (!cancelled) setDegreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  function clearConfirm(stepId) {
    setConfirming((prev) => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }

  function goNext() {
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      if (hasSavedProfile) setMode('entry');
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleContinueWithProfile() {
    const relevant = steps.filter((s) => ['learner', 'level', 'university', 'degree'].includes(s));
    setConfirming(new Set(relevant));
    setMode('wizard');
    setStepIndex(0);
  }

  function handleStartFresh() {
    setLearnerType('');
    setLevel('');
    setUniversity('');
    setDegree('');
    setConfirming(new Set());
    setMode('wizard');
    setStepIndex(0);
  }

  function handlePickLearnerType(id) {
    setLearnerType(id);
    clearConfirm('learner');
    setStepIndex(1);
  }

  function handleStillTrue(stepId) {
    clearConfirm(stepId);
    goNext();
  }

  function handleEdit(stepId) {
    clearConfirm(stepId);
  }

  function handleStart() {
    const profile = { learnerType };
    if (learnerType === 'school') {
      profile.level = level;
    } else if (learnerType === 'university') {
      profile.level = level;
      profile.university = university;
      profile.degree = degree;
    }
    onComplete({ profile, topic: topic.trim(), subtopic: subtopic.trim(), material: material.trim() });
  }

  function jumpToStep(stepId) {
    const idx = steps.indexOf(stepId);
    if (idx >= 0) {
      clearConfirm(stepId);
      setStepIndex(idx);
    }
  }

  function renderStillTrue(stepId, valueLabel, onEditExtra) {
    return (
      <div className={styles.confirmBox}>
        <div className={styles.confirmValue}>{valueLabel}</div>
        <div className={styles.confirmQuestion}>Still true?</div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={() => { handleEdit(stepId); if (onEditExtra) onEditExtra(); }}>
            Edit
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => handleStillTrue(stepId)}>
            Yes, still true
          </button>
        </div>
      </div>
    );
  }

  function renderLearnerStep() {
    if (confirming.has('learner')) {
      return renderStillTrue('learner', learnerTypeLabel(learnerType));
    }
    return (
      <div className={styles.chipGrid}>
        {LEARNER_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === learnerType ? styles.chipActive : styles.chip}
            onClick={() => handlePickLearnerType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  function renderLevelStep() {
    if (confirming.has('level')) {
      return renderStillTrue('level', learnerType === 'university' ? levelLabel('university', level) : level);
    }
    if (learnerType === 'university') {
      return (
        <>
          <div className={styles.chipGrid}>
            {UNIVERSITY_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={l.id === level ? styles.chipActive : styles.chip}
                onClick={() => setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
            <button type="button" className={styles.primaryButton} disabled={!level} onClick={goNext}>Next</button>
          </div>
        </>
      );
    }
    return (
      <>
        <div className={styles.chipGrid}>
          {SCHOOL_CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              className={c === level ? styles.chipActive : styles.chip}
              onClick={() => setLevel(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          className={styles.input}
          placeholder="e.g. Class 10"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.primaryButton} disabled={!level.trim()} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderUniversityStep() {
    if (confirming.has('university')) {
      return renderStillTrue('university', university);
    }
    return (
      <>
        <input
          className={styles.input}
          placeholder="e.g. Delhi University"
          value={university}
          autoFocus
          onChange={(e) => setUniversity(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.primaryButton} disabled={!university.trim()} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderDegreeStep() {
    if (confirming.has('degree')) {
      return renderStillTrue('degree', degree);
    }
    return (
      <>
        {degreeLoading && <div className={styles.hint}>Looking up programs at {university}...</div>}
        {!degreeLoading && degreeSuggestions.length > 0 && (
          <div className={styles.chipGrid}>
            {degreeSuggestions.map((d) => (
              <button
                key={d}
                type="button"
                className={d === degree ? styles.chipActive : styles.chip}
                onClick={() => setDegree(d)}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        <input
          className={styles.input}
          placeholder="e.g. M.Tech in Physics"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.primaryButton} disabled={!degree.trim()} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderTopicStep() {
    return (
      <>
        <input
          className={styles.input}
          placeholder="e.g. Thermodynamics"
          value={topic}
          autoFocus
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.primaryButton} disabled={!topic.trim()} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderSubtopicStep() {
    return (
      <>
        <input
          className={styles.input}
          placeholder="e.g. Entropy (optional)"
          value={subtopic}
          autoFocus
          onChange={(e) => setSubtopic(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.secondaryButton} onClick={goNext}>Skip</button>
          <button type="button" className={styles.primaryButton} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderMaterialStep() {
    return (
      <>
        <input
          className={styles.input}
          placeholder="e.g. NCERT Class 10 Physics (optional)"
          value={material}
          autoFocus
          onChange={(e) => setMaterial(e.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.secondaryButton} onClick={goNext}>Skip</button>
          <button type="button" className={styles.primaryButton} onClick={goNext}>Next</button>
        </div>
      </>
    );
  }

  function renderReviewStep() {
    const rows = [{ label: 'Learner', value: learnerTypeLabel(learnerType), stepId: 'learner' }];
    if (steps.includes('level')) {
      rows.push({ label: 'Level', value: learnerType === 'university' ? levelLabel('university', level) : level, stepId: 'level' });
    }
    if (steps.includes('university')) rows.push({ label: 'University', value: university, stepId: 'university' });
    if (steps.includes('degree')) rows.push({ label: 'Degree', value: degree, stepId: 'degree' });
    rows.push({ label: 'Topic', value: topic, stepId: 'topic' });
    rows.push({ label: 'Subtopic', value: subtopic || '—', stepId: 'subtopic' });
    rows.push({ label: 'Material', value: material || '—', stepId: 'material' });

    return (
      <>
        <ul className={styles.reviewList}>
          {rows.map((row) => (
            <li key={row.stepId} className={styles.reviewRow}>
              <span className={styles.reviewLabel}>{row.label}</span>
              <span className={styles.reviewValue}>{row.value}</span>
              <button type="button" className={styles.editLink} onClick={() => jumpToStep(row.stepId)}>
                Edit
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={goBack}>Back</button>
          <button type="button" className={styles.primaryButton} onClick={handleStart}>Start Session</button>
        </div>
      </>
    );
  }

  const stepTitles = {
    learner: 'Who is learning?',
    level: 'What level?',
    university: 'Which university?',
    degree: 'Which degree program?',
    topic: 'What topic do you want to discuss?',
    subtopic: 'Any specific subtopic?',
    material: 'Any material to ground answers in?',
    review: 'Review your session',
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {mode === 'wizard' && (
            <span className={styles.stepIndicator}>Step {stepIndex + 1} of {steps.length}</span>
          )}
          <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>

        {mode === 'entry' ? (
          <>
            <h3 className={styles.title}>Welcome back</h3>
            <p className={styles.subtitle}>{profileSummary(savedProfile)}. Still accurate?</p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={handleStartFresh}>
                Start Fresh
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleContinueWithProfile}>
                Continue with this
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>{stepTitles[currentStepId]}</h3>
            {currentStepId === 'learner' && renderLearnerStep()}
            {currentStepId === 'level' && renderLevelStep()}
            {currentStepId === 'university' && renderUniversityStep()}
            {currentStepId === 'degree' && renderDegreeStep()}
            {currentStepId === 'topic' && renderTopicStep()}
            {currentStepId === 'subtopic' && renderSubtopicStep()}
            {currentStepId === 'material' && renderMaterialStep()}
            {currentStepId === 'review' && renderReviewStep()}
          </>
        )}
      </div>
    </div>
  );
}
