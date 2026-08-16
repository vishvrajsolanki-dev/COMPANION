import React from 'react';
import styles from './TabBar.module.css';
import { LayoutDashboard, Calendar, BookOpen, User } from 'lucide-react';
import { navigateTo } from '../../hooks/useHashLocation';
import { TabType } from '../../store/uiStore';

export interface TabBarProps {
  activeTab: TabType;
  onSelectTab?: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab }) => {
  const tabs = [
    { id: 'home' as TabType, hash: '#today', label: 'Today', icon: LayoutDashboard },
    { id: 'schedule' as TabType, hash: '#plan/timetable', label: 'Plan', icon: Calendar },
    { id: 'tasks' as TabType, hash: '#study/tasks', label: 'Study', icon: BookOpen },
    { id: 'profile' as TabType, hash: '#account', label: 'Account', icon: User },
  ];

  return (
    <nav className={styles.navBar} aria-label="Main Navigation">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => navigateTo(t.hash)}
            className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
            aria-label={t.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={`${styles.tabPill} ${isActive ? styles.tabPillActive : ''}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
            </span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;
