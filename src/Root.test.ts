import { describe, expect, it } from 'vitest';
import { PLANNER_HASH, isPlannerHash } from './Root.tsx';

describe('isPlannerHash', () => {
  it('opens the planner only for its own hash', () => {
    expect(isPlannerHash(PLANNER_HASH)).toBe(true);
    expect(isPlannerHash('#/planner/')).toBe(true);
    expect(isPlannerHash('')).toBe(false);
    expect(isPlannerHash('#/')).toBe(false);
    expect(isPlannerHash('#/plannerx')).toBe(false);
  });
});
