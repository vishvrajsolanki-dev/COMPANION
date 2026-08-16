import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Button, ButtonVariant } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** tone selects the confirm button variant — 'danger' for destructive data actions */
  tone?: 'danger' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Academic OS confirmation sheet. Replaces native browser window.confirm() dialogs
 * with an accessible, keyboard-trapped, mobile-safe bottom sheet following Stitch design system.
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
  const confirmVariant: ButtonVariant =
    tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary';

  const isDestructive = tone === 'danger';

  return (
    <BottomSheet open={open} onClose={onCancel} maxWidth={440}>
      <div
        data-testid="confirm-dialog"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-lg, 12px)',
              backgroundColor: isDestructive
                ? 'var(--error-container, #ffdad6)'
                : 'var(--surface-container-low, #f4f3f2)',
              color: isDestructive
                ? 'var(--on-error-container, #93000a)'
                : 'var(--primary, #001e4c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isDestructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>

          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--on-surface, #1a1c1c)',
              margin: 0,
              fontFamily: 'var(--font-primary)',
            }}
          >
            {title}
          </h3>
        </div>

        {message && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--on-surface-variant, #444750)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Button
            data-testid="confirm-dialog-button"
            variant={confirmVariant}
            style={{ flex: 1, minHeight: 44 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            data-testid="cancel-dialog-button"
            variant="ghost"
            style={{ flex: 1, minHeight: 44 }}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default ConfirmDialog;
