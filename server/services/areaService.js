import { AppError, parseId } from '../utils/errors.js';
import { calculateAreaProgress, calculateCourseProgress } from './progressService.js';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Повертає всі сфери користувача разом із розрахованим прогресом.
 */
export function listAreas(db, userId) {
  const areas = db
    .prepare('SELECT * FROM areas WHERE user_id = ? ORDER BY created_at ASC, id ASC')
    .all(userId);

  const courses = db
    .prepare('SELECT id, area_id FROM courses WHERE user_id = ?')
    .all(userId);

  const tasks = db
    .prepare('SELECT id, course_id, status FROM tasks WHERE user_id = ?')
    .all(userId);

  const tasksByCourse = new Map();
  for (const task of tasks) {
    const arr = tasksByCourse.get(task.course_id) || [];
    arr.push(task);
    tasksByCourse.set(task.course_id, arr);
  }

  return areas.map((area) => {
    const areaCourses = courses.filter((c) => c.area_id === area.id);
    const coursesWithProgress = areaCourses.map((c) => ({
      ...c,
      progress: calculateCourseProgress(tasksByCourse.get(c.id) || []),
    }));

    return {
      ...area,
      courseCount: areaCourses.length,
      progress: calculateAreaProgress(coursesWithProgress),
    };
  });
}

/**
 * Повертає одну сферу користувача з перевіркою прав доступу.
 */
export function getAreaById(db, userId, areaId) {
  const id = parseId(areaId, 'Ідентифікатор сфери');
  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);

  if (!area) {
    throw new AppError('Сферу не знайдено.', 404);
  }
  if (area.user_id !== userId) {
    throw new AppError('Немає доступу до цієї сфери.', 403);
  }

  return area;
}

/**
 * Створює нову сферу життя/навчання.
 */
export function createArea(db, userId, { name, color = '#2563EB', icon = 'BookOpen' }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanColor = typeof color === 'string' ? color.trim() : '#2563EB';
  const cleanIcon = typeof icon === 'string' && icon.trim() ? icon.trim() : 'BookOpen';

  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new AppError('Назва сфери має містити від 2 до 100 символів.', 400);
  }
  if (!HEX_COLOR_REGEX.test(cleanColor)) {
    throw new AppError('Колір сфери має бути у форматі HEX (наприклад, #2563EB).', 400);
  }

  const res = db
    .prepare('INSERT INTO areas (user_id, name, color, icon) VALUES (?, ?, ?, ?)')
    .run(userId, cleanName, cleanColor, cleanIcon);

  return getAreaById(db, userId, res.lastInsertRowid);
}

/**
 * Оновлює дані сфери користувача.
 */
export function updateArea(db, userId, areaId, { name, color, icon }) {
  const existing = getAreaById(db, userId, areaId);

  const nextName = name !== undefined ? String(name).trim() : existing.name;
  const nextColor = color !== undefined ? String(color).trim() : existing.color;
  const nextIcon = icon !== undefined ? String(icon).trim() : existing.icon;

  if (nextName.length < 2 || nextName.length > 100) {
    throw new AppError('Назва сфери має містити від 2 до 100 символів.', 400);
  }
  if (!HEX_COLOR_REGEX.test(nextColor)) {
    throw new AppError('Колір сфери має бути у форматі HEX (наприклад, #2563EB).', 400);
  }

  db.prepare('UPDATE areas SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?').run(
    nextName,
    nextColor,
    nextIcon || 'BookOpen',
    existing.id,
    userId
  );

  return getAreaById(db, userId, existing.id);
}

/**
 * Видаляє сферу разом із курсами, завданнями й подіями (каскадно).
 */
export function deleteArea(db, userId, areaId) {
  const existing = getAreaById(db, userId, areaId);
  db.prepare('DELETE FROM areas WHERE id = ? AND user_id = ?').run(existing.id, userId);
  return { deleted: true, id: existing.id };
}
