import React from 'react';
import styles from './ui.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnGhost,
  ghost: styles.btnGhost,
  subtle: styles.btnSubtle,
  danger: styles.btnDanger,
  success: styles.btnSuccess,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

/** Academic OS canonical Button component. */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className,
  disabled,
  ...rest
}) => (
  <button
    disabled={disabled || isLoading}
    className={[
      styles.btn,
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      fullWidth ? styles.btnFull : '',
      className || '',
    ].join(' ')}
    {...rest}
  >
    {isLoading ? (
      <>
        <span className={styles.btnSpinner} aria-hidden="true" />
        <span>Loading...</span>
      </>
    ) : (
      children
    )}
  </button>
);

export default Button;
