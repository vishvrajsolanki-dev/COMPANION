import React, { useEffect, useRef } from 'react';
import styles from './ui.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Shared bottom sheet with focus trap + auto-focus.
 *
 * Behavior:
 *   - Escape closes (existing).
 *   - Tab / Shift+Tab cycle within the sheet while open (focus trap).
 *   - The first focusable element inside the sheet is auto-focused on open.
 *   - On close, focus returns to whatever element opened the sheet (the
 *     trigger element's ref is implicitly captured from the browser focus
 *     state at open-time).
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, children, maxWidth = 500 }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap + auto-focus
  useEffect(() => {
    if (!open) return;

    // Remember who triggered this sheet so we can return focus on close
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    // Auto-focus the first focusable element inside the sheet after paint
    const raf = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      const focusable = panelRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });

    // Escape to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap: Tab / Shift+Tab cycling
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Return focus to the trigger element that opened the sheet
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.sheetOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={panelRef}
        className={styles.sheetPanel}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.sheetHandle} />
        {children}
      </div>
    </div>
  );
};
