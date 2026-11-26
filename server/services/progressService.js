/**
 * Авторський модуль розрахунку навчального прогресу, прострочень і статистики.
 */

/**
 * Обчислює відсоток виконання курсу на основі списку його завдань.
 * Повертає 0, якщо завдань у курсі ще немає.
 */
export function calculateCourseProgress(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 0;
  }

  let doneCount = 0;
  for (const task of tasks) {
    if (task.status === 'done') {
      doneCount += 1;
    }
  }

  return Math.round((doneCount / tasks.length) * 100);
}

/**
 * Обчислює прогрес сфери як середнє арифметичне прогресу її курсів.
 * Повертає 0, якщо у сфері немає жодного курсу.
 */
export function calculateAreaProgress(coursesWithProgress = []) {
  if (!Array.isArray(coursesWithProgress) || coursesWithProgress.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const course of coursesWithProgress) {
    sum += Number(course.progress || 0);
  }

  return Math.round(sum / coursesWithProgress.length);
}

/**
 * Обчислює загальний відсоток прогресу користувача по всіх курсах.
 */
export function calculateOverallProgress(coursesWithProgress = []) {
  if (!Array.isArray(coursesWithProgress) || coursesWithProgress.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const course of coursesWithProgress) {
    sum += Number(course.progress || 0);
  }

  return Math.round(sum / coursesWithProgress.length);
}

/**
 * Визначає, чи є завдання простроченим:
 * дедлайн уже минув, а статус не дорівнює 'done'.
 */
export function isTaskOverdue(task, now = new Date()) {
  if (!task || task.status === 'done' || !task.deadline) {
    return false;
  }

  const deadlineDate = new Date(task.deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return false;
  }

  return deadlineDate.getTime() < now.getTime();
}

/**
 * Повертає значення completed_at при зміні статусу завдання.
 * Статус 'done' автоматично фіксує час завершення.
 */
export function resolveCompletedAt(newStatus, existingCompletedAt = null, now = new Date()) {
  if (newStatus === 'done') {
    return existingCompletedAt || now.toISOString();
  }
  return null;
}

/**
 * Формує тижневі інтервали за останні 4 тижні для графіка виконаних завдань.
 */
export function buildWeeklyCompletionSeries(tasks = [], now = new Date()) {
  const msInDay = 24 * 60 * 60 * 1000;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const weeks = [];
  for (let i = 3; i >= 0; i -= 1) {
    const weekEnd = new Date(endOfToday.getTime() - i * 7 * msInDay);
    const weekStart = new Date(weekEnd.getTime() - 7 * msInDay + 1);

    const startDay = String(weekStart.getDate()).padStart(2, '0');
    const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const endDay = String(weekEnd.getDate()).padStart(2, '0');
    const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');

    let count = 0;
    for (const task of tasks) {
      if (task.status === 'done' && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (
          !Number.isNaN(completedDate.getTime()) &&
          completedDate.getTime() >= weekStart.getTime() &&
          completedDate.getTime() <= weekEnd.getTime()
        ) {
          count += 1;
        }
      }
    }

    weeks.push({
      weekLabel: `${startDay}.${startMonth}–${endDay}.${endMonth}`,
      count,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    });
  }

  return weeks;
}

/**
 * Збирає повний пакет аналітики й статистики прогресу користувача.
 */
export function buildStatsPayload({ areas = [], courses = [], tasks = [], now = new Date() }) {
  const areaMap = new Map();
  for (const area of areas) {
    areaMap.set(area.id, area);
  }

  // Групуємо завдання за курсами
  const tasksByCourse = new Map();
  for (const task of tasks) {
    const list = tasksByCourse.get(task.course_id) || [];
    list.push(task);
    tasksByCourse.set(task.course_id, list);
  }

  // Прогрес по кожному курсу
  const courseProgress = courses.map((course) => {
    const courseTasks = tasksByCourse.get(course.id) || [];
    const doneTasks = courseTasks.filter((t) => t.status === 'done').length;
    const progress = calculateCourseProgress(courseTasks);
    const area = areaMap.get(course.area_id);

    return {
      id: course.id,
      title: course.title,
      areaId: course.area_id,
      areaName: area ? area.name : 'Без сфери',
      areaColor: area ? area.color : '#2563EB',
      progress,
      totalTasks: courseTasks.length,
      doneTasks,
    };
  });

  // Прогрес та кількість завдань по кожній сфері
  const areaDistribution = areas.map((area) => {
    const areaCourses = courseProgress.filter((c) => c.areaId === area.id);
    const totalInArea = areaCourses.reduce((acc, c) => acc + c.totalTasks, 0);
    const doneInArea = areaCourses.reduce((acc, c) => acc + c.doneTasks, 0);

    return {
      id: area.id,
      name: area.name,
      color: area.color,
      progress: calculateAreaProgress(areaCourses),
      courseCount: areaCourses.length,
      count: totalInArea,
      doneCount: doneInArea,
    };
  });

  // Лічильники станів завдань
  let done = 0;
  let inProgress = 0;
  let todo = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.status === 'done') {
      done += 1;
    } else if (task.status === 'in_progress') {
      inProgress += 1;
    } else {
      todo += 1;
    }

    if (isTaskOverdue(task, now)) {
      overdue += 1;
    }
  }

  return {
    counters: {
      total: tasks.length,
      done,
      in_progress: inProgress,
      todo,
      overdue,
    },
    overallProgress: calculateOverallProgress(courseProgress),
    courseProgress,
    areaProgress: areaDistribution,
    areaDistribution: areaDistribution.filter((a) => a.count > 0),
    weeklyCompleted: buildWeeklyCompletionSeries(tasks, now),
    streak: calculateStreak(tasks, now),
  };
}

/**
 * Перетворює дату на рядок "РРРР-ММ-ДД" за місцевим часом.
 */
function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Рахує серію днів: скільки днів поспіль користувач виконував
 * хоча б одне завдання. Якщо сьогодні ще нічого не виконано,
 * серія не обривається, а рахується від учорашнього дня.
 */
export function calculateStreak(tasks = [], now = new Date()) {
  // 1. Збираємо всі дні, коли було виконано хоча б одне завдання
  const doneDays = new Set();
  for (const task of tasks) {
    if (task.status === 'done' && task.completed_at) {
      const completedDate = new Date(task.completed_at);
      if (!Number.isNaN(completedDate.getTime())) {
        doneDays.add(toDayKey(completedDate));
      }
    }
  }

  // 2. Обираємо день, з якого починаємо рахувати
  const currentDay = new Date(now);
  if (!doneDays.has(toDayKey(currentDay))) {
    currentDay.setDate(currentDay.getDate() - 1);
  }

  // 3. Йдемо назад по днях, поки не трапиться день без виконаних завдань
  let streak = 0;
  while (doneDays.has(toDayKey(currentDay))) {
    streak += 1;
    currentDay.setDate(currentDay.getDate() - 1);
  }

  return streak;
}
