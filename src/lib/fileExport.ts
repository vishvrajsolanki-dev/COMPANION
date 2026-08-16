/**
 * iOS-safe JSON file export (H4).
 *
 * Safari on iOS has never fully honoured the `<a download>` attribute for blob
 * URLs — and in this app the programmatic click necessarily happens after an
 * `await` (the backup JSON is built from async IndexedDB reads), which loses
 * the user-gesture context that iOS uses to decide whether a download is
 * allowed. The result on iPhone: "Backup Data" and Clear All Data's auto-export
 * silently produced nothing.
 *
 * The reliable iOS path is the Web Share API with a File (iOS 15+): it opens
 * the native share sheet with "Save to Files". Desktop / non-iOS engines keep
 * the plain anchor download, which works there. If the user dismisses the share
 * sheet we report 'cancel' so callers can keep going; any other share failure
 * falls back to the anchor so the export never silently no-ops.
 */

export type ExportMethod = 'share' | 'download' | 'cancel';

export interface ShareCapability {
  /** Running in iOS Safari / iPadOS (where anchor downloads are unreliable). */
  isIOS: boolean;
  /** Engine exposes navigator.canShare() and accepts a single-file payload. */
  canShareFiles: boolean;
}

/** True for iPhone/iPad/iPod UAs, and for iPadOS 13+ (macOS Safari UA + touch). */
export function detectIOS(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return (
    /iP(ad|hone|od)/.test(userAgent) ||
    (platform === 'MacIntel' && maxTouchPoints > 1 && /Safari/.test(userAgent))
  );
}

/** Which delivery mechanism to use for this engine. */
export function resolveExportPath(cap: ShareCapability): 'share' | 'download' {
  return cap.isIOS && cap.canShareFiles ? 'share' : 'download';
}

export interface ExportResult {
  /** 'share' via the Web Share API, 'download' via the anchor fallback, or 'cancel' (user dismissed the sheet). */
  method: ExportMethod;
  /** File name the payload was handed to the browser / share sheet with. */
  filename: string;
}

export async function exportJSONFile(filename: string, json: unknown): Promise<ExportResult> {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  const isIOS = detectIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
  const canShareFiles =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  if (resolveExportPath({ isIOS, canShareFiles }) === 'share') {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'Student Academic OS backup',
      });
      return { method: 'share', filename };
    } catch (err) {
      // AbortError = the user dismissed the sheet. Not a failure — callers keep going.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { method: 'cancel', filename };
      }
      // NotAllowedError (lost user gesture) or any engine hiccup → fall through
      // to the anchor download rather than silently doing nothing.
    }
  }

  // Desktop / non-iOS: classic anchor download. On iOS 13–14 (no File share)
  // open the blob in a viewer the user can save from, instead of the silent no-op.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  if (isIOS) a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  // Keep the blob + element alive long enough for the browser to start the
  // download; revoking synchronously races the blob in some iOS versions.
  window.setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
  return { method: 'download', filename };
}
