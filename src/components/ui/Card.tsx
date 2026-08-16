import React from 'react';
import styles from './ui.module.css';

export type CardVariant = 'flat' | 'raised' | 'hero' | 'accent' | 'surface-low';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  liftable?: boolean;
  accentBorder?: boolean;
  variant?: CardVariant;
}

/** Academic OS canonical Card surface container component. */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  padded = true,
  liftable = false,
  accentBorder = false,
  variant = 'flat',
  ...rest
}) => {
  const variantClass =
    variant === 'raised'      ? styles.cardRaised :
    variant === 'hero'        ? styles.cardHero :
    variant === 'accent'      ? styles.cardAccent :
    variant === 'surface-low' ? styles.cardSurfaceLow :
    '';

  return (
    <div
      className={[
        styles.card,
        padded ? styles.padded : '',
        liftable ? styles.liftable : '',
        accentBorder ? styles.cardAccentLeft : '',
        variantClass,
        className || '',
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
