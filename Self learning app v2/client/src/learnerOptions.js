export const LEARNER_TYPES = [
  { id: 'school', label: 'School' },
  { id: 'university', label: 'University' },
  { id: 'self-directed', label: 'Self-directed' },
];

export const UNIVERSITY_LEVELS = [
  { id: 'undergrad', label: 'Undergrad' },
  { id: 'postgrad', label: 'Postgrad' },
  { id: 'doctoral', label: 'Doctoral' },
];

export const SCHOOL_CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

export const FALLBACK_DEGREES = ['B.Sc', 'B.Tech', 'B.A.', 'M.Sc', 'M.Tech', 'M.A.', 'PhD'];

export function getWizardSteps(learnerType) {
  if (learnerType === 'school') {
    return ['learner', 'level', 'topic', 'subtopic', 'material', 'review'];
  }
  if (learnerType === 'university') {
    return ['learner', 'level', 'university', 'degree', 'topic', 'subtopic', 'material', 'review'];
  }
  if (learnerType === 'self-directed') {
    return ['learner', 'topic', 'subtopic', 'material', 'review'];
  }
  return ['learner'];
}

export function learnerTypeLabel(id) {
  const found = LEARNER_TYPES.find((t) => t.id === id);
  return found ? found.label : id;
}

export function levelLabel(learnerType, id) {
  if (learnerType === 'university') {
    const found = UNIVERSITY_LEVELS.find((l) => l.id === id);
    return found ? found.label : id;
  }
  return id;
}

export function profileSummary(profile) {
  if (!profile || !profile.learnerType) return '';
  if (profile.learnerType === 'school') {
    return `School student${profile.level ? `, ${profile.level}` : ''}`;
  }
  if (profile.learnerType === 'university') {
    const parts = [];
    if (profile.level) parts.push(levelLabel('university', profile.level));
    if (profile.degree) parts.push(profile.degree);
    const base = parts.length ? parts.join(' — ') : 'University student';
    return profile.university ? `${base} at ${profile.university}` : base;
  }
  return 'Self-directed learner';
}
