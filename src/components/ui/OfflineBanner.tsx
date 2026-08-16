import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { Banner } from './Banner';
import { Button } from './Button';

export type NetworkSyncStatus =
  | 'offline-cache'
  | 'blocked'
  | 'pending-sync'
  | 'syncing'
  | 'sync-success'
  | 'sync-failure';

export interface OfflineBannerProps {
  status: NetworkSyncStatus;
  onRetry?: () => void;
  message?: string;
  className?: string;
}

/**
 * Academic OS Offline & Network Sync state indicator.
 * Academic OS is offline-first: local IndexedDB data remains fully functional.
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  status,
  onRetry,
  message,
  className,
}) => {
  if (status === 'offline-cache') {
    return (
      <Banner
        tone="info"
        title="Offline Mode"
        icon={<WifiOff size={18} />}
        className={className}
      >
        {message || 'Working from local IndexedDB cache. All features remain fully functional.'}
      </Banner>
    );
  }

  if (status === 'blocked') {
    return (
      <Banner
        tone="warning"
        title="Connection Required"
        icon={<CloudOff size={18} />}
        action={onRetry ? <Button size="sm" variant="ghost" onClick={onRetry}>Retry</Button> : undefined}
        className={className}
      >
        {message || 'An internet connection is required to complete this action.'}
      </Banner>
    );
  }

  if (status === 'pending-sync') {
    return (
      <Banner
        tone="info"
        title="Changes Queued"
        icon={<RefreshCw size={18} />}
        className={className}
      >
        {message || 'Local changes queued for cloud backup once reconnected.'}
      </Banner>
    );
  }

  if (status === 'syncing') {
    return (
      <Banner
        tone="info"
        title="Syncing"
        icon={<RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />}
        className={className}
      >
        {message || 'Synchronizing local database with cloud storage…'}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Banner>
    );
  }

  if (status === 'sync-success') {
    return (
      <Banner
        tone="success"
        title="Sync Complete"
        icon={<CheckCircle2 size={18} />}
        className={className}
      >
        {message || 'All local changes successfully backed up to cloud.'}
      </Banner>
    );
  }

  // sync-failure
  return (
    <Banner
      tone="danger"
      title="Sync Failed"
      icon={<AlertTriangle size={18} />}
      action={onRetry ? <Button size="sm" variant="danger" onClick={onRetry}>Try Again</Button> : undefined}
      className={className}
    >
      {message || 'Failed to sync with cloud. Your data is safe locally.'}
    </Banner>
  );
};

export default OfflineBanner;
