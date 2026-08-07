import React from 'react';
import styles from './ui.module.css';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Generic segmented control — replaces duplicated filter-tab bars (tasks, exams, analytics). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className={styles.segmented}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`${styles.segmentedItem} ${value === o.value ? styles.segmentedItemActive : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
