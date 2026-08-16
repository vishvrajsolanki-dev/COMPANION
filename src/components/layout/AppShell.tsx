import React from 'react';
import styles from './AppShell.module.css';
import { useUIStore, TabType } from '../../store/uiStore';
import { TabBar } from './TabBar';
import { navigateTo, useHashLocation } from '../../hooks/useHashLocation';
import { LayoutDashboard, Calendar, BookOpen, User, Sun, Moon } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // Sync URL hash with uiStore Zustand state
  useHashLocation();

  const activeTab = useUIStore(state => state.activeTab);
  const activeSubview = useUIStore(state => state.activeSubview);
  const theme = useUIStore(state => state.theme);
  const toggleTheme = useUIStore(state => state.toggleTheme);

  const navItems = [
    { id: 'home' as TabType, hash: '#today', label: 'Today', icon: LayoutDashboard },
    { id: 'schedule' as TabType, hash: '#plan/timetable', label: 'Plan', icon: Calendar },
    { id: 'tasks' as TabType, hash: '#study/tasks', label: 'Study', icon: BookOpen },
    { id: 'profile' as TabType, hash: '#account', label: 'Account', icon: User },
  ];

  return (
    <div className={styles.shellContainer}>
      {/* Skip to Main Content link for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only sr-only-focusable"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to main content
      </a>

      {/* 256px Desktop Sidebar / Navigation Rail */}
      <aside className={styles.sidebar} aria-label="Desktop Sidebar Navigation">
        <div className={styles.sidebarHeader}>
          <div className={styles.brandLogo} aria-hidden="true">OS</div>
          <div>
            <div className={styles.brandTitle}>Academic OS</div>
            <div className={styles.brandSubtitle}>Student ERP</div>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Primary Navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !activeSubview;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.hash)}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            onClick={toggleTheme}
            className={styles.themeToggleBtn}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Scroll Area */}
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        {children}
      </main>

      {/* Mobile Persistent Bottom Tab Bar (hides when subview active or on desktop) */}
      {!activeSubview && (
        <TabBar activeTab={activeTab} />
      )}
    </div>
  );
};

export default AppShell;
