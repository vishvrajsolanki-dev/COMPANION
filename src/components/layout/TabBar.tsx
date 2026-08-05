import React from 'react';
import styles from './TabBar.module.css';
import { Home, Calendar, CheckSquare, User } from 'lucide-react';

export type TabType = 'home' | 'schedule' | 'tasks' | 'profile';

interface TabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className={styles.navBar}>
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
