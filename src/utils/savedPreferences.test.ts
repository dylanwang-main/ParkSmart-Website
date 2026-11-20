import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  clearPreferences,
  isCustomized,
  loadPreferences,
  savePreferences,
} from './savedPreferences.ts';

function fakeStore(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}

describe('saved preferences', () => {
  it('returns null when nothing is saved or the data is unreadable', () => {
    expect(loadPreferences(fakeStore())).toBeNull();
    expect(loadPreferences(fakeStore('not json'))).toBeNull();
    expect(loadPreferences(fakeStore('[1,2]'))).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences(null)).toBeNull();
  });

  it('remembers permit, priority and walking limit', () => {
    const store = fakeStore();
    savePreferences({ permitType: 'B', priority: 'shorter_walk', maxWalkMinutes: 10 }, store);
    expect(loadPreferences(store)).toEqual({ permitType: 'B', priority: 'shorter_walk', maxWalkMinutes: 10 });
  });

  it('remembers the default 20-minute limit as null', () => {
    const store = fakeStore();
    savePreferences({ permitType: 'S', priority: 'balanced', maxWalkMinutes: null }, store);
    expect(loadPreferences(store)?.maxWalkMinutes).toBeNull();
  });

  it('replaces an invalid field with its default and keeps the valid ones', () => {
    const stored = JSON.stringify({ permitType: 'ZZ', priority: 'more_availability', maxWalkMinutes: 7 });
    expect(loadPreferences(fakeStore(stored))).toEqual({
      permitType: 'S',
      priority: 'more_availability',
      maxWalkMinutes: null,
    });
  });

  it('forgets saved settings when cleared', () => {
    const store = fakeStore();
    savePreferences({ permitType: 'D', priority: 'balanced', maxWalkMinutes: 5 }, store);
    clearPreferences(store);
    expect(loadPreferences(store)).toBeNull();
  });

  it('keeps working when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadPreferences(broken)).toBeNull();
    expect(() => savePreferences(DEFAULT_PREFERENCES, broken)).not.toThrow();
    expect(() => clearPreferences(broken)).not.toThrow();
  });

  it('tells defaults from customized settings', () => {
    expect(isCustomized(DEFAULT_PREFERENCES)).toBe(false);
    expect(isCustomized({ ...DEFAULT_PREFERENCES, permitType: 'B' })).toBe(true);
    expect(isCustomized({ ...DEFAULT_PREFERENCES, maxWalkMinutes: 10 })).toBe(true);
  });
});
