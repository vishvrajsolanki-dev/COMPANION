import React from 'react';
import styles from './ui.module.css';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/** Generic segmented control — with ARIA tablist/tab semantics. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Filter options',
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.segmented} role="tablist" aria-label={ariaLabel}>
      {options.map(o => {
        const isSelected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(o.value)}
            className={`${styles.segmentedItem} ${isSelected ? styles.segmentedItemActive : ''}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
