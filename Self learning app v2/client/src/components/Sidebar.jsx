import { useState } from 'react';
import styles from './Sidebar.module.css';
import { ModelPicker } from './ModelPicker.jsx';
import { SessionCard } from './SessionCard.jsx';

const NAV_ITEMS = [
  { id: 'sessions', icon: '💬', label: 'Session' },
  { id: 'techniqueBank', icon: '🗺️', label: 'Technique Bank' },
  { id: 'skills', icon: '⚡', label: 'Skills' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

const VISIBLE_SESSION_COUNT = 3;

export function Sidebar({
  topics,
  selectedTopicId,
  onSelectTopic,
  onOpenWizard,
  activeModel,
  onChangeActiveModel,
  activePanel,
  onNavigate,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleSessions = topics.slice(0, VISIBLE_SESSION_COUNT);
  const hiddenCount = Math.max(0, topics.length - VISIBLE_SESSION_COUNT);

  function isNavActive(itemId) {
    if (itemId === 'sessions') {
      return activePanel === 'sessions' || (activePanel === null && Boolean(selectedTopicId));
    }
    return activePanel === itemId;
  }

  return (
    <aside className={collapsed ? styles.sidebarCollapsed : styles.sidebar}>
      <div className={styles.scrollArea}>
        <div className={styles.header}>
          <div className={styles.brand}>{collapsed ? '📚' : '📚 Tutor'}</div>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <button
          type="button"
          className={styles.newSessionButton}
          onClick={onOpenWizard}
          title="New Session"
        >
          {collapsed ? '+' : '+ New Session'}
        </button>

        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={isNavActive(item.id) ? styles.navItemActive : styles.navItem}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {!collapsed && item.id === 'sessions' && (
                <span className={styles.navBadge}>{topics.length > 0 ? topics.length : 'none yet'}</span>
              )}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className={styles.sessionsSection}>
            <div className={styles.sessionsHeader}>
              <span className={styles.label}>Previous Sessions</span>
              <span className={styles.countBadge}>{topics.length}</span>
            </div>
            <div className={styles.sessionsList}>
              {visibleSessions.map((topic) => (
                <SessionCard key={topic.id} topic={topic} onClick={() => onSelectTopic(topic.id)} />
              ))}
            </div>
            {hiddenCount > 0 && (
              <div className={styles.moreHint}>{hiddenCount} more behind the header</div>
            )}
          </div>
        )}
      </div>

      <ModelPicker selectedModel={activeModel} onSelect={onChangeActiveModel} />
    </aside>
  );
}
