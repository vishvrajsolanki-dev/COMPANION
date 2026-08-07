import React from 'react';
import styles from './ui.module.css';

export type GlassButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'success';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<GlassButtonVariant, string> = {
  primary: styles.btnPrimary,
  ghost: styles.btnGhost,
  subtle: styles.btnSubtle,
  danger: styles.btnDanger,
  success: styles.btnSuccess,
};

const SIZE_CLASS: Record<GlassButtonSize, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

/** Academic Core button. primary = solid blue pill, ghost = bordered white, subtle = tinted blue, danger/success = soft status-tinted. */
export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  ...rest
}) => (
  <button
    className={[
      styles.btn,
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      fullWidth ? styles.btnFull : '',
      className || '',
    ].join(' ')}
    {...rest}
  >
    {children}
  </button>
);
