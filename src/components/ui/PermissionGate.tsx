import React from 'react';
import { ShieldAlert, Lock, UserX } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export type PermissionGateReason = 'unauthorized' | 'restricted' | 'admin-denied';

export interface PermissionGateProps {
  reason?: PermissionGateReason;
  title?: string;
  message?: string;
  requiredRole?: string;
  onBack?: () => void;
  className?: string;
}

/**
 * Academic OS Permission & Authorization gate component.
 * Replaces unhandled permission rejections with clear Stitch role-gated feedback.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  reason = 'admin-denied',
  title,
  message,
  requiredRole = 'ADMIN / OWNER',
  onBack,
  className,
}) => {
  const getIcon = () => {
    switch (reason) {
      case 'unauthorized': return <UserX size={36} />;
      case 'restricted':   return <Lock size={36} />;
      default:             return <ShieldAlert size={36} />;
    }
  };

  const defaultTitle = title || (
    reason === 'unauthorized'
      ? 'Activation Required'
      : reason === 'restricted'
      ? 'Feature Restricted'
      : 'Access Denied'
  );

  const defaultMessage = message || (
    reason === 'unauthorized'
      ? 'You must activate this device with a valid access key before accessing this module.'
      : reason === 'restricted'
      ? `This feature requires ${requiredRole} permissions.`
      : 'This portal is restricted to authorized institution administrators and owners.'
  );

  return (
    <div
      data-testid={`permission-gate-${reason}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--stack-lg, 32px) var(--stack-md, 16px)',
        backgroundColor: 'var(--surface-container-lowest, #ffffff)',
        border: '1px solid var(--outline-variant, #c4c6d1)',
        borderRadius: 'var(--radius-card, 12px)',
        textAlign: 'center',
        gap: 16,
        maxWidth: 420,
        margin: 'auto',
      }}
      className={className}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-full, 9999px)',
          backgroundColor: 'var(--error-container, #ffdad6)',
          color: 'var(--on-error-container, #93000a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {getIcon()}
      </div>

      <div>
        <Badge tone="danger" style={{ marginBottom: 8 }}>
          {requiredRole}
        </Badge>
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--on-surface, #1a1c1c)',
            margin: 0,
            fontFamily: 'var(--font-primary)',
          }}
        >
          {defaultTitle}
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant, #444750)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {defaultMessage}
        </p>
      </div>

      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          Return to Hub
        </Button>
      )}
    </div>
  );
};

export default PermissionGate;
