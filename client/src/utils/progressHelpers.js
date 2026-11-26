/**
 * Допоміжна клієнтська логіка для розрахунку прогресу, фільтрації завдань та перевірки 24-годинних дедлайнів.
 */

export const PRIORITY_LABELS = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
};

export const STATUS_LABELS = {
  todo: 'До виконання',
  in_progress: 'В процесі',
  done: 'Виконано',
};

export function computeCompletionPercent(doneCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  return Math.round((doneCount / totalCount) * 100);
}

/**
 * Повертає завдання, дедлайн яких настає протягом найближчих 24 годин і які ще не виконані.
 */
export function getDueWithin24Hours(tasks = [], now = new Date()) {
  const nowMs = now.getTime();
  const limitMs = nowMs + 24 * 60 * 60 * 1000;

  return tasks.filter((task) => {
    if (!task || task.status === 'done' || !task.deadline) return false;
    const deadlineMs = new Date(task.deadline).getTime();
    if (Number.isNaN(deadlineMs)) return false;
    return deadlineMs >= nowMs && deadlineMs <= limitMs;
  });
}

/**
 * Перевіряє, чи завдання прострочене на клієнті.
 */
export function checkTaskOverdue(task, now = new Date()) {
  if (!task || task.status === 'done' || !task.deadline) return false;
  const deadlineMs = new Date(task.deadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  return deadlineMs < now.getTime();
}

/**
 * Розгортає щотижневі події на кілька тижнів уперед і назад для відображення в календарі.
 */
export function expandRecurringEvents(events = [], weeksBack = 4, weeksAhead = 8) {
  const expanded = [];
  const msInWeek = 7 * 24 * 60 * 60 * 1000;

  for (const event of events) {
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    if (event.recurrence !== 'weekly') {
      expanded.push({
        ...event,
        instanceId: `event-${event.id}`,
        start,
        end,
      });
      continue;
    }

    for (let offset = -weeksBack; offset <= weeksAhead; offset += 1) {
      const occStart = new Date(start.getTime() + offset * msInWeek);
      const occEnd = new Date(end.getTime() + offset * msInWeek);
      if (occStart.getTime() < start.getTime() - msInWeek) continue;

      expanded.push({
        ...event,
        instanceId: `event-${event.id}-w${offset}`,
        start: occStart,
        end: occEnd,
      });
    }
  }

  return expanded;
}
