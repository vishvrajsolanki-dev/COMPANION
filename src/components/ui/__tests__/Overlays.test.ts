import { describe, it, expect } from 'vitest';
import * as UI from '../index';
import { BottomSheet } from '../BottomSheet';
import { ConfirmDialog } from '../ConfirmDialog';
import { ToastProvider, useToast } from '../Toast';
import { Banner } from '../Banner';

describe('Feedback & Overlay Primitives (Milestone 3)', () => {
  it('exports BottomSheet primitive', () => {
    expect(UI.BottomSheet).toBeDefined();
    expect(BottomSheet).toBe(UI.BottomSheet);
    expect(typeof BottomSheet).toBe('function');
  });

  it('exports ConfirmDialog primitive', () => {
    expect(UI.ConfirmDialog).toBeDefined();
    expect(ConfirmDialog).toBe(UI.ConfirmDialog);
    expect(typeof ConfirmDialog).toBe('function');
  });

  it('exports ToastProvider and useToast hook', () => {
    expect(UI.ToastProvider).toBeDefined();
    expect(ToastProvider).toBe(UI.ToastProvider);
    expect(typeof ToastProvider).toBe('function');
    expect(typeof useToast).toBe('function');
  });

  it('exports Banner primitive', () => {
    expect(UI.Banner).toBeDefined();
    expect(Banner).toBe(UI.Banner);
    expect(typeof Banner).toBe('function');
  });
});
