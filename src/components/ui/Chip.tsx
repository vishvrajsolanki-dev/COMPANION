import React from 'react';
import styles from './ui.module.css';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

/** Selectable filter chip. */
export const Chip: React.FC<ChipProps> = ({ active = false, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
  >
    {children}
  </button>
);
