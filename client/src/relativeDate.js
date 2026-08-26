export function formatRelativeDate(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return '';

  const now = new Date();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((startOfNow - startOfThen) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'today';
  return `${diffDays}d`;
}
