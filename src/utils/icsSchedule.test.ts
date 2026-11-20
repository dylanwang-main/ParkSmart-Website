import { describe, expect, it } from 'vitest';
import { classesOn, parseIcs } from './icsSchedule.ts';

const wrap = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', ...events, 'END:VCALENDAR'].join('\r\n');

const event = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

// Mon Nov 16 2026 is the first Monday used below.
const WEEKLY_MWF = event(
  'UID:cse100@x',
  'SUMMARY:CSE 100 Lecture',
  'LOCATION:CENTR 115',
  'DTSTART;TZID=America/Los_Angeles:20261116T093000',
  'DTEND;TZID=America/Los_Angeles:20261116T104000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261211T235959'
);

describe('parseIcs', () => {
  it('reads title, location and local time of a single class', () => {
    const events = parseIcs(
      wrap(
        event(
          'UID:a',
          'SUMMARY:MATH 20C',
          'LOCATION:WLH 2001',
          'DTSTART;TZID=America/Los_Angeles:20261117T140000',
          'DTEND;TZID=America/Los_Angeles:20261117T145000'
        )
      )
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: 'MATH 20C', location: 'WLH 2001', date: '2026-11-17', startMinutes: 840, durationMinutes: 50 });
  });

  it('unfolds long lines and unescapes text', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Intro to\\, well\\; everything',
      'LOCATION:Price Center',
      '  East',
      'DTSTART:20261117T090000',
      'DTEND:20261117T095000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const [e] = parseIcs(text);
    expect(e.title).toBe('Intro to, well; everything');
    expect(e.location).toBe('Price Center East');
  });

  it('converts UTC times to campus local time', () => {
    // 2026-11-17 22:00Z is 14:00 PST
    const [e] = parseIcs(wrap(event('SUMMARY:UTC class', 'DTSTART:20261117T220000Z', 'DTEND:20261117T225000Z')));
    expect(e).toMatchObject({ date: '2026-11-17', startMinutes: 840, durationMinutes: 50 });
  });

  it('handles daylight saving when converting UTC', () => {
    // 2026-07-01 16:00Z is 09:00 PDT
    const [e] = parseIcs(wrap(event('SUMMARY:Summer', 'DTSTART:20260701T160000Z', 'DTEND:20260701T165000Z')));
    expect(e).toMatchObject({ date: '2026-07-01', startMinutes: 540 });
  });

  it('skips all-day events and events without a start', () => {
    const events = parseIcs(
      wrap(
        event('SUMMARY:Holiday', 'DTSTART;VALUE=DATE:20261126', 'DTEND;VALUE=DATE:20261127'),
        event('SUMMARY:Broken'),
        event('SUMMARY:Real', 'DTSTART:20261117T090000', 'DTEND:20261117T095000')
      )
    );
    expect(events.map((e) => e.title)).toEqual(['Real']);
  });

  it('defaults a missing end to a one-hour class', () => {
    const [e] = parseIcs(wrap(event('SUMMARY:No end', 'DTSTART:20261117T090000')));
    expect(e.durationMinutes).toBe(60);
  });

  it('returns nothing for text that is not a calendar', () => {
    expect(parseIcs('hello world')).toEqual([]);
    expect(parseIcs('')).toEqual([]);
  });
});

describe('classesOn', () => {
  const events = parseIcs(wrap(WEEKLY_MWF));

  it('lists a weekly class only on its days', () => {
    expect(classesOn(events, '2026-11-16')).toHaveLength(1); // Mon
    expect(classesOn(events, '2026-11-17')).toHaveLength(0); // Tue
    expect(classesOn(events, '2026-11-18')).toHaveLength(1); // Wed
    expect(classesOn(events, '2026-11-20')).toHaveLength(1); // Fri
  });

  it('does not list a class before it starts or after UNTIL', () => {
    expect(classesOn(events, '2026-11-13')).toHaveLength(0); // Fri before the first Monday
    expect(classesOn(events, '2026-12-14')).toHaveLength(0); // Mon after UNTIL (Dec 11)
    expect(classesOn(events, '2026-12-11')).toHaveLength(1); // last Friday
  });

  it('reports start and end minutes', () => {
    const [c] = classesOn(events, '2026-11-18');
    expect(c).toMatchObject({ title: 'CSE 100 Lecture', location: 'CENTR 115', startMinutes: 570, endMinutes: 640 });
  });

  it('honours INTERVAL for every other week', () => {
    const biweekly = parseIcs(
      wrap(event('SUMMARY:Lab', 'DTSTART:20261116T090000', 'DTEND:20261116T100000', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO'))
    );
    expect(classesOn(biweekly, '2026-11-16')).toHaveLength(1);
    expect(classesOn(biweekly, '2026-11-23')).toHaveLength(0);
    expect(classesOn(biweekly, '2026-11-30')).toHaveLength(1);
  });

  it('honours COUNT', () => {
    const three = parseIcs(
      wrap(event('SUMMARY:Short', 'DTSTART:20261116T090000', 'DTEND:20261116T100000', 'RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=MO'))
    );
    expect(classesOn(three, '2026-11-30')).toHaveLength(1); // third Monday
    expect(classesOn(three, '2026-12-07')).toHaveLength(0);
  });

  it('honours EXDATE', () => {
    const skipped = parseIcs(
      wrap(
        event(
          'SUMMARY:Class',
          'DTSTART;TZID=America/Los_Angeles:20261116T090000',
          'DTEND;TZID=America/Los_Angeles:20261116T100000',
          'RRULE:FREQ=WEEKLY;BYDAY=MO',
          'EXDATE;TZID=America/Los_Angeles:20261123T090000'
        )
      )
    );
    expect(classesOn(skipped, '2026-11-16')).toHaveLength(1);
    expect(classesOn(skipped, '2026-11-23')).toHaveLength(0);
    expect(classesOn(skipped, '2026-11-30')).toHaveLength(1);
  });

  it('repeats on the start weekday when BYDAY is missing', () => {
    const weekly = parseIcs(
      wrap(event('SUMMARY:Weekly', 'DTSTART:20261118T090000', 'DTEND:20261118T100000', 'RRULE:FREQ=WEEKLY'))
    );
    expect(classesOn(weekly, '2026-11-25')).toHaveLength(1);
    expect(classesOn(weekly, '2026-11-24')).toHaveLength(0);
  });

  it('treats an unsupported recurrence as a single class on its start date', () => {
    const monthly = parseIcs(
      wrap(event('SUMMARY:Odd', 'DTSTART:20261118T090000', 'DTEND:20261118T100000', 'RRULE:FREQ=MONTHLY'))
    );
    expect(classesOn(monthly, '2026-11-18')).toHaveLength(1);
    expect(classesOn(monthly, '2026-12-18')).toHaveLength(0);
  });

  it('sorts a day by start time', () => {
    const day = parseIcs(
      wrap(
        event('SUMMARY:Late', 'DTSTART:20261117T150000', 'DTEND:20261117T155000'),
        event('SUMMARY:Early', 'DTSTART:20261117T080000', 'DTEND:20261117T085000')
      )
    );
    expect(classesOn(day, '2026-11-17').map((c) => c.title)).toEqual(['Early', 'Late']);
  });
});

describe('messy calendars', () => {
  const MWF = (uid = 'cse100') =>
    event(
      `UID:${uid}`,
      'SUMMARY:CSE 100',
      'LOCATION:CENTR 115',
      'DTSTART;TZID=America/Los_Angeles:20261116T093000',
      'DTEND;TZID=America/Los_Angeles:20261116T104000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261211T235959'
    );

  it('skips a cancelled class', () => {
    const events = parseIcs(
      wrap(event('UID:x', 'SUMMARY:Gone', 'STATUS:CANCELLED', 'DTSTART:20261117T090000', 'DTEND:20261117T095000'))
    );
    expect(events).toEqual([]);
  });

  it('replaces one session with its moved version, not both', () => {
    // The Wednesday Nov 18 session was moved to 2 PM in WLH
    const moved = event(
      'UID:cse100',
      'RECURRENCE-ID;TZID=America/Los_Angeles:20261118T093000',
      'SUMMARY:CSE 100',
      'LOCATION:WLH 2001',
      'DTSTART;TZID=America/Los_Angeles:20261118T140000',
      'DTEND;TZID=America/Los_Angeles:20261118T151000'
    );
    const events = parseIcs(wrap(MWF(), moved));
    const wed = classesOn(events, '2026-11-18');
    expect(wed).toHaveLength(1);
    expect(wed[0]).toMatchObject({ startMinutes: 14 * 60, location: 'WLH 2001' });
    // Other days are untouched
    expect(classesOn(events, '2026-11-20')[0]).toMatchObject({ startMinutes: 570, location: 'CENTR 115' });
  });

  it('drops one cancelled session of a repeating class', () => {
    const cancelled = event(
      'UID:cse100',
      'RECURRENCE-ID;TZID=America/Los_Angeles:20261120T093000',
      'STATUS:CANCELLED',
      'SUMMARY:CSE 100',
      'DTSTART;TZID=America/Los_Angeles:20261120T093000',
      'DTEND;TZID=America/Los_Angeles:20261120T104000'
    );
    const events = parseIcs(wrap(MWF(), cancelled));
    expect(classesOn(events, '2026-11-20')).toHaveLength(0);
    expect(classesOn(events, '2026-11-18')).toHaveLength(1);
    expect(classesOn(events, '2026-11-23')).toHaveLength(1);
  });

  it('shows the same class once when a calendar lists it twice', () => {
    const events = parseIcs(wrap(MWF('a'), MWF('b')));
    expect(classesOn(events, '2026-11-18')).toHaveLength(1);
  });

  it('keeps reading past events it cannot understand', () => {
    const events = parseIcs(
      wrap(
        event('UID:bad1', 'SUMMARY:Bad time', 'DTSTART:not-a-time'),
        event('DTSTART:20261117T080000'), // no UID and no title
        MWF()
      )
    );
    expect(classesOn(events, '2026-11-18').map((c) => c.title)).toContain('CSE 100');
    expect(classesOn(events, '2026-11-17').map((c) => c.title)).toEqual(['Class']);
  });
});
