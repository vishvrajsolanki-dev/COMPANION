import { describe, it, expect } from 'vitest';
import * as UI from '../index';
import { Button } from '../Button';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Chip } from '../Chip';
import { Skeleton } from '../Skeleton';
describe('Core Primitives Module Exports (Milestone 2)', () => {
  it('exports canonical Button primitive', () => {
    expect(UI.Button).toBeDefined();
    expect(Button).toBe(UI.Button);
    expect(typeof Button).toBe('function');
  });

  it('exports canonical Card primitive', () => {
    expect(UI.Card).toBeDefined();
    expect(Card).toBe(UI.Card);
    expect(typeof Card).toBe('function');
  });

  it('exports Badge, Chip, and Skeleton primitives', () => {
    expect(UI.Badge).toBeDefined();
    expect(UI.Chip).toBeDefined();
    expect(UI.Skeleton).toBeDefined();
    expect(Badge).toBe(UI.Badge);
    expect(Chip).toBe(UI.Chip);
    expect(Skeleton).toBe(UI.Skeleton);
    expect(typeof Badge).toBe('function');
    expect(typeof Chip).toBe('function');
    expect(typeof Skeleton).toBe('function');
  });
});
