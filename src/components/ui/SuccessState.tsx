import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

export type SuccessType = 'saved' | 'completed' | 'imported' | 'synced' | 'updated';

export interface SuccessStateProps {
  type?: SuccessType;
  message?: string;
  variant?: 'badge' | 'banner' | 'card';
  className?: string;
}

const TYPE_DEFAULTS: Record<SuccessType, string> = {
  saved:     'Changes saved successfully',
  completed: 'Action completed',
  imported:  'Data imported successfully',
  synced:    'Synced with server',
  updated:   'Updated successfully',
};

/** Restrained success state indicator matching Stitch quiet luxury principles. */
export const SuccessState: React.FC<SuccessStateProps> = ({
  type = 'saved',
  message,
  variant = 'card',
  className,
}) => {
  const text = message || TYPE_DEFAULTS[type];

  if (variant === 'badge') {
    return (
      <Badge tone="success" className={className}>
        <CheckCircle2 size={12} style={{ marginRight: 4 }} />
        {text}
      </Badge>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        data-testid={`success-state-${type}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md, 8px)',
          backgroundColor: 'var(--color-success-bg, rgba(15,51,109,0.08))',
          color: 'var(--success-attendance, #0f336d)',
          fontSize: '0.875rem',
          fontWeight: 600,
          border: '1px solid var(--outline-variant, #c4c6d1)',
        }}
        className={className}
      >
        <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div
      data-testid={`success-state-${type}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 'var(--stack-md, 16px)',
        backgroundColor: 'var(--surface-container-lowest, #ffffff)',
        border: '1px solid var(--outline-variant, #c4c6d1)',
        borderRadius: 'var(--radius-card, 12px)',
        textAlign: 'center',
      }}
      className={className}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-full, 9999px)',
          backgroundColor: 'var(--color-success-bg, rgba(15,51,109,0.08))',
          color: 'var(--success-attendance, #0f336d)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckCircle2 size={24} />
      </div>
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          color: 'var(--on-surface, #1a1c1c)',
          fontFamily: 'var(--font-primary)',
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default SuccessState;
