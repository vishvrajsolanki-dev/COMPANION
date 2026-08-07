import React from 'react';
import styles from './ui.module.css';

export type GlassCardVariant = 'flat' | 'raised' | 'hero' | 'accent';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  liftable?: boolean;
  variant?: GlassCardVariant;
}

/** Frosted-glass card surface with variant shapes. */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  padded = true,
  liftable = false,
  variant = 'flat',
  ...rest
}) => {
  const variantClass =
    variant === 'raised' ? styles.cardRaised :
    variant === 'hero'  ? styles.cardHero  :
    variant === 'accent' ? styles.cardAccent :
    '';

  return (
    <div
      className={[
        styles.glassCard,
        padded ? styles.padded : '',
        liftable ? styles.liftable : '',
        variantClass,
        className || '',
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};
