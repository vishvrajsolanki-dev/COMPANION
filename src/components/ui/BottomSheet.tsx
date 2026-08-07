import React, { useEffect } from 'react';
import styles from './ui.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Single shared bottom sheet — replaces the ~10 duplicated
 * `position:fixed inset:0 rgba(0,0,0,.4-.5)` scrim + sheet blocks in views.
 * Behavior is identical to the previous per-view implementations.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, children, maxWidth = 500 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.sheetOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheetPanel} style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        {children}
      </div>
    </div>
  );
};
