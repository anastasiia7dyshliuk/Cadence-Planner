import { describe, expect, it } from 'vitest';
import { formatDateTimeUk, getGreetingUk } from '../utils/dateHelpers.js';
import {
  checkTaskOverdue,
  computeCompletionPercent,
  expandRecurringEvents,
  getDueWithin24Hours,
} from '../utils/progressHelpers.js';

describe('Frontend progressHelpers & dateHelpers (Vitest)', () => {
  it('computeCompletionPercent коректно обчислює відсоток', () => {
    expect(computeCompletionPercent(0, 0)).toBe(0);
    expect(computeCompletionPercent(3, 4)).toBe(75);
    expect(computeCompletionPercent(5, 5)).toBe(100);
  });

  it('checkTaskOverdue визначає прострочені незавершені завдання', () => {
    const now = new Date('2026-11-25T15:00:00.000Z');
    expect(checkTaskOverdue({ deadline: '2026-11-25T14:00:00.000Z', status: 'todo' }, now)).toBe(
      true
    );
    expect(checkTaskOverdue({ deadline: '2026-11-25T14:00:00.000Z', status: 'done' }, now)).toBe(
      false
    );
    expect(
      checkTaskOverdue({ deadline: '2026-11-26T14:00:00.000Z', status: 'in_progress' }, now)
    ).toBe(false);
  });

  it('getDueWithin24Hours знаходить тільки активні завдання у межах 24 годин', () => {
    const now = new Date('2026-11-25T12:00:00.000Z');
    const tasks = [
      { id: 1, status: 'todo', deadline: '2026-11-25T18:00:00.000Z' },
      { id: 2, status: 'done', deadline: '2026-11-25T18:00:00.000Z' },
      { id: 3, status: 'in_progress', deadline: '2026-11-27T18:00:00.000Z' },
      { id: 4, status: 'todo', deadline: '2026-11-24T10:00:00.000Z' },
    ];

    const due = getDueWithin24Hours(tasks, now);
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe(1);
  });

  it('expandRecurringEvents розгортає щотижневі заняття на кілька тижнів', () => {
    const events = [
      {
        id: 1,
        title: 'Німецька мова',
        start_datetime: '2026-11-25T17:00:00.000Z',
        end_datetime: '2026-11-25T18:30:00.000Z',
        recurrence: 'weekly',
      },
      {
        id: 2,
        title: 'Консультація',
        start_datetime: '2026-11-26T14:00:00.000Z',
        end_datetime: '2026-11-26T15:00:00.000Z',
        recurrence: 'none',
      },
    ];

    const expanded = expandRecurringEvents(events, 1, 2);
    expect(expanded.length).toBeGreaterThan(2);
    expect(expanded.filter((e) => e.id === 2)).toHaveLength(1);
  });

  it('getGreetingUk і formatDateTimeUk повертають локалізовані значення для uk та en', () => {
    expect(getGreetingUk(new Date('2026-11-25T09:00:00'))).toBe('Доброго ранку');
    expect(getGreetingUk(new Date('2026-11-25T14:00:00'))).toBe('Доброго дня');
    expect(getGreetingUk(new Date('2026-11-25T20:00:00'))).toBe('Доброго вечора');
    expect(getGreetingUk(new Date('2026-11-25T09:00:00'), 'en')).toBe('Good morning');
    expect(getGreetingUk(new Date('2026-11-25T14:00:00'), 'en')).toBe('Good afternoon');
    expect(formatDateTimeUk('2026-11-25T14:30:00', 'en')).toContain('Nov');
  });
});
