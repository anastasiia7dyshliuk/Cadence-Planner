import {
  buildStatsPayload,
  calculateAreaProgress,
  calculateCourseProgress,
  isTaskOverdue,
  resolveCompletedAt,
} from '../services/progressService.js';

describe('progressService — розрахунок прогресу та прострочень', () => {
  test('calculateCourseProgress повертає 0, якщо завдань немає', () => {
    expect(calculateCourseProgress([])).toBe(0);
  });

  test('calculateCourseProgress коректно рахує відсоток виконаних завдань', () => {
    const tasks = [
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' },
      { status: 'todo' },
    ];
    expect(calculateCourseProgress(tasks)).toBe(50);
  });

  test('calculateAreaProgress обчислює середній прогрес по курсах сфери', () => {
    expect(calculateAreaProgress([])).toBe(0);
    const courses = [{ progress: 100 }, { progress: 50 }, { progress: 0 }];
    expect(calculateAreaProgress(courses)).toBe(50);
  });

  test('isTaskOverdue повертає true тільки коли дедлайн у минулому і статус не done', () => {
    const now = new Date('2026-11-25T12:00:00.000Z');
    expect(
      isTaskOverdue({ deadline: '2026-11-24T12:00:00.000Z', status: 'todo' }, now)
    ).toBe(true);
    expect(
      isTaskOverdue({ deadline: '2026-11-24T12:00:00.000Z', status: 'done' }, now)
    ).toBe(false);
    expect(
      isTaskOverdue({ deadline: '2026-11-26T12:00:00.000Z', status: 'in_progress' }, now)
    ).toBe(false);
  });

  test('resolveCompletedAt встановлює дату для done і скидає на null для інших статусів', () => {
    const now = new Date('2026-11-25T12:00:00.000Z');
    expect(resolveCompletedAt('done', null, now)).toBe('2026-11-25T12:00:00.000Z');
    expect(resolveCompletedAt('done', '2026-11-20T10:00:00.000Z', now)).toBe(
      '2026-11-20T10:00:00.000Z'
    );
    expect(resolveCompletedAt('in_progress', '2026-11-20T10:00:00.000Z', now)).toBeNull();
  });

  test('buildStatsPayload формує лічильники, прогрес курсів і тижневу серію', () => {
    const now = new Date('2026-11-25T12:00:00.000Z');
    const areas = [{ id: 1, name: 'Коледж', color: '#2563EB' }];
    const courses = [{ id: 10, area_id: 1, title: 'Алгоритми' }];
    const tasks = [
      {
        id: 1,
        course_id: 10,
        status: 'done',
        deadline: '2026-11-20T10:00:00.000Z',
        completed_at: '2026-11-24T10:00:00.000Z',
      },
      {
        id: 2,
        course_id: 10,
        status: 'todo',
        deadline: '2026-11-24T10:00:00.000Z',
        completed_at: null,
      },
    ];

    const stats = buildStatsPayload({ areas, courses, tasks, now });
    expect(stats.counters).toEqual({
      total: 2,
      done: 1,
      in_progress: 0,
      todo: 1,
      overdue: 1,
    });
    expect(stats.overallProgress).toBe(50);
    expect(stats.courseProgress[0].progress).toBe(50);
    expect(stats.weeklyCompleted).toHaveLength(4);
  });
});
