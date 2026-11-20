import { describe, expect, it } from 'vitest';
import { ARRIVE_BEFORE_CLASS_MINUTES, arrivalForClass, formatClock, matchBuilding } from './scheduleTrips.ts';

describe('matchBuilding', () => {
  it('matches a UCSD class-schedule code at the start of the location', () => {
    expect(matchBuilding('CENTR 115')?.id).toBe('center-hall');
    expect(matchBuilding('WLH 2001')?.id).toBe('warren-lecture-hall');
    expect(matchBuilding('PCYNH 106')?.id).toBe('pepper-canyon-hall');
    expect(matchBuilding('peter 108')?.id).toBe('peterson-hall');
  });

  it('matches codes and aliases written with punctuation', () => {
    expect(matchBuilding('APM B402')?.id).toBe('applied-physics-and-mathematics');
    expect(matchBuilding('AP&M 2402')?.id).toBe('applied-physics-and-mathematics');
  });

  it('matches a building named in full', () => {
    expect(matchBuilding('York Hall 2722')?.id).toBe('york-hall');
    expect(matchBuilding('Room 100, Warren Lecture Hall')?.id).toBe('warren-lecture-hall');
  });

  it('returns null for unknown, remote or empty locations', () => {
    expect(matchBuilding('')).toBeNull();
    expect(matchBuilding('Remote')).toBeNull();
    expect(matchBuilding('Zoom')).toBeNull();
    expect(matchBuilding('Room 2001')).toBeNull();
  });
});

describe('arrivalForClass', () => {
  it('arrives a set time before the class starts', () => {
    expect(arrivalForClass({ date: '2026-11-18', startMinutes: 9 * 60 + 30 })).toEqual({
      arrivalDate: '2026-11-18',
      arrivalTime: '09:10',
    });
    expect(ARRIVE_BEFORE_CLASS_MINUTES).toBe(20);
  });

  it('never goes before midnight', () => {
    expect(arrivalForClass({ date: '2026-11-18', startMinutes: 10 })).toEqual({
      arrivalDate: '2026-11-18',
      arrivalTime: '00:00',
    });
  });
});

describe('formatClock', () => {
  it('formats minutes as a 12-hour clock', () => {
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(9 * 60 + 5)).toBe('9:05 AM');
    expect(formatClock(12 * 60)).toBe('12:00 PM');
    expect(formatClock(13 * 60 + 30)).toBe('1:30 PM');
  });
});
