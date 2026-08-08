import { useEffect } from 'react';
import { useToast } from './ui/Toast';

/**
 * Listens for unhandled promise rejections (uncaught `await db.*` writes, etc.)
 * and surfaces them as a user-visible toast so IndexedDB failures aren't silent.
 */
export const GlobalErrorCatcher: React.FC = () => {
  const toast = useToast();

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        reason?.message ||
        (typeof reason === 'string' ? reason : '') ||
        'An unexpected error occurred.';

      // Don't spam toasts — only show Dexie / database / storage errors.
      if (reason?.name === 'DexieError' || /storage|quota|database|IndexedDB/i.test(msg)) {
        toast.show(`Save failed: ${msg}`, 'error');
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [toast]);

  return null;
};
