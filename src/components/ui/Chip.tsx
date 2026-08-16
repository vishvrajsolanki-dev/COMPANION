import React from 'react';
import styles from './ui.module.css';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

/** Academic OS canonical Chip filter button component. */
export const Chip: React.FC<ChipProps> = ({
  active = false,
  onClick,
  children,
  className,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    onClick={onClick}
    aria-pressed={active}
    className={[styles.chip, active ? styles.chipActive : '', className || ''].join(' ')}
    {...rest}
  >
    {children}
  </button>
);

export default Chip;
