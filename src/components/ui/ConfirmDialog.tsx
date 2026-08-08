import React from 'react';
import { BottomSheet } from './BottomSheet';
import { GlassButton, GlassButtonVariant } from './GlassButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** tone selects the confirm button variant — 'danger' for destructive actions */
  tone?: 'danger' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm(). Renders on the shared BottomSheet
 * so destructive confirmations keep the same mobile-safe, themed look as the
 * rest of the app (Part G: no more browser-native confirm dialogs).
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmVariant: GlassButtonVariant =
    tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary';

  return (
    <BottomSheet open={open} onClose={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        {message && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <GlassButton variant={confirmVariant} style={{ flex: 1 }} onClick={onConfirm}>
            {confirmLabel}
          </GlassButton>
          <GlassButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </GlassButton>
        </div>
      </div>
    </BottomSheet>
  );
};

export default ConfirmDialog;
