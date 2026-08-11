import { describe, it, expect } from 'vitest';
import { detectIOS, resolveExportPath } from './fileExport';

describe('detectIOS', () => {
  it('detects iPhone Safari UA', () => {
    expect(detectIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'iPhone', 5)).toBe(true);
  });

  it('detects iPad UA', () => {
    expect(detectIOS('Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'iPad', 5)).toBe(true);
  });

  it('detects iPadOS 13+ reported as macOS Safari with a touchscreen', () => {
    // iPadOS masquerades as desktop Safari but reports touch points.
    expect(detectIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'MacIntel', 5)).toBe(true);
  });

  it('does not flag desktop macOS Safari without touch', () => {
    expect(detectIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'MacIntel', 0)).toBe(false);
  });

  it('does not flag Chrome on Windows', () => {
    expect(detectIOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'Win32', 0)).toBe(false);
  });

  it('does not flag Android Chrome', () => {
    expect(detectIOS('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36', 'Linux armv8l', 5)).toBe(false);
  });
});

describe('resolveExportPath', () => {
  it('prefers share on iOS when the engine can share files', () => {
    expect(resolveExportPath({ isIOS: true, canShareFiles: true })).toBe('share');
  });

  it('falls back to anchor download on iOS when the engine cannot share files (iOS 13–14)', () => {
    expect(resolveExportPath({ isIOS: true, canShareFiles: false })).toBe('download');
  });

  it('keeps anchor download on non-iOS engines even if they could share', () => {
    expect(resolveExportPath({ isIOS: false, canShareFiles: true })).toBe('download');
  });

  it('keeps anchor download on non-iOS engines without share', () => {
    expect(resolveExportPath({ isIOS: false, canShareFiles: false })).toBe('download');
  });
});
