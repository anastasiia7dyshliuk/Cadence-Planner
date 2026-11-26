import { calculateStreak } from '../services/progressService.js';

describe('calculateStreak — серія днів', () => {
    const now = new Date(2026, 10, 26, 15, 0);

    test('повертає 0, якщо виконаних завдань немає', () => {
        expect(calculateStreak([], now)).toBe(0);
    });

    test('рахує дні поспіль, включно із сьогоднішнім', () => {
        const tasks = [
            { status: 'done', completed_at: new Date(2026, 10, 26, 9, 0).toISOString() },
            { status: 'done', completed_at: new Date(2026, 10, 25, 20, 0).toISOString() },
            { status: 'done', completed_at: new Date(2026, 10, 24, 8, 0).toISOString() },
        ];
        expect(calculateStreak(tasks, now)).toBe(3);
    });

    test('не обриває серію, якщо сьогодні ще нічого не виконано', () => {
        const tasks = [
            { status: 'done', completed_at: new Date(2026, 10, 25, 20, 0).toISOString() },
            { status: 'done', completed_at: new Date(2026, 10, 24, 8, 0).toISOString() },
        ];
        expect(calculateStreak(tasks, now)).toBe(2);
    });

    test('зупиняється на першому дні без виконаних завдань', () => {
        const tasks = [
            { status: 'done', completed_at: new Date(2026, 10, 26, 9, 0).toISOString() },
            { status: 'done', completed_at: new Date(2026, 10, 24, 8, 0).toISOString() },
            { status: 'todo', completed_at: null },
        ];
        expect(calculateStreak(tasks, now)).toBe(1);
    });
});