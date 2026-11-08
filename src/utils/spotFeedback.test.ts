import { describe, expect, it } from 'vitest';
import { loadFeedback, recordFeedback } from './spotFeedback.ts';

function fakeStore() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('spotFeedback', () => {
  it('starts empty and ignores corrupt data', () => {
    const store = fakeStore();
    expect(loadFeedback(store)).toEqual([]);
    store.setItem('parksmart.spotFeedback.v1', '{not json');
    expect(loadFeedback(store)).toEqual([]);
  });

  it('records answers in order with a timestamp', () => {
    const store = fakeStore();
    const now = new Date('2026-11-10T18:00:00Z');
    recordFeedback({ locationId: 'a', found: true, arrival: null }, store, now);
    recordFeedback({ locationId: 'b', found: false, arrival: '2026-11-10T10:00' }, store, now);
    const log = loadFeedback(store);
    expect(log.map((e) => [e.locationId, e.found])).toEqual([['a', true], ['b', false]]);
    expect(log[0].answeredAt).toBe(now.toISOString());
  });

  it('works without storage', () => {
    expect(recordFeedback({ locationId: 'a', found: true, arrival: null }, null)).toHaveLength(1);
  });
});
