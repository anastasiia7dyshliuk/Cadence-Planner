import { AppError, parseId } from '../utils/errors.js';
import { getAreaById } from './areaService.js';
import { calculateCourseProgress } from './progressService.js';

function isValidDateString(str) {
  if (typeof str !== 'string' || !str.trim()) return false;
  const d = new Date(str);
  return !Number.isNaN(d.getTime());
}

/**
 * Повертає список курсів користувача з опційним фільтром за сферою та прогресом.
 */
export function listCourses(db, userId, { areaId } = {}) {
  let sql = `
    SELECT c.*, a.name AS area_name, a.color AS area_color, a.icon AS area_icon
    FROM courses c
    JOIN areas a ON a.id = c.area_id
    WHERE c.user_id = ?
  `;
  const params = [userId];

  if (areaId !== undefined && areaId !== '' && areaId !== 'all') {
    const parsedAreaId = parseId(areaId, 'Ідентифікатор сфери');
    sql += ' AND c.area_id = ?';
    params.push(parsedAreaId);
  }

  sql += ' ORDER BY c.start_date DESC, c.id DESC';
  const courses = db.prepare(sql).all(...params);

  const tasks = db
    .prepare('SELECT id, course_id, status FROM tasks WHERE user_id = ?')
    .all(userId);

  const tasksByCourse = new Map();
  for (const task of tasks) {
    const list = tasksByCourse.get(task.course_id) || [];
    list.push(task);
    tasksByCourse.set(task.course_id, list);
  }

  return courses.map((course) => {
    const courseTasks = tasksByCourse.get(course.id) || [];
    const doneTasks = courseTasks.filter((t) => t.status === 'done').length;

    return {
      ...course,
      totalTasks: courseTasks.length,
      doneTasks,
      progress: calculateCourseProgress(courseTasks),
    };
  });
}

/**
 * Повертає конкретний курс із перевіркою власника.
 */
export function getCourseById(db, userId, courseId) {
  const id = parseId(courseId, 'Ідентифікатор курсу');
  const course = db
    .prepare(`
      SELECT c.*, a.name AS area_name, a.color AS area_color, a.icon AS area_icon
      FROM courses c
      JOIN areas a ON a.id = c.area_id
      WHERE c.id = ?
    `)
    .get(id);

  if (!course) {
    throw new AppError('Курс не знайдено.', 404);
  }
  if (course.user_id !== userId) {
    throw new AppError('Немає доступу до цього курсу.', 403);
  }

  const tasks = db
    .prepare('SELECT id, status FROM tasks WHERE course_id = ? AND user_id = ?')
    .all(course.id, userId);

  return {
    ...course,
    totalTasks: tasks.length,
    doneTasks: tasks.filter((t) => t.status === 'done').length,
    progress: calculateCourseProgress(tasks),
  };
}

/**
 * Створює новий курс усередині сфери користувача.
 */
export function createCourse(db, userId, { area_id, title, description = '', start_date, end_date }) {
  const area = getAreaById(db, userId, area_id);
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (cleanTitle.length < 2 || cleanTitle.length > 100) {
    throw new AppError('Назва курсу має містити від 2 до 100 символів.', 400);
  }
  if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
    throw new AppError('Вкажіть коректні дати початку та завершення курсу.', 400);
  }
  if (new Date(end_date) < new Date(start_date)) {
    throw new AppError('Дата завершення курсу не може бути раніше дати початку.', 400);
  }

  const res = db
    .prepare(`
      INSERT INTO courses (user_id, area_id, title, description, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(userId, area.id, cleanTitle, cleanDesc, start_date.trim(), end_date.trim());

  return getCourseById(db, userId, res.lastInsertRowid);
}

/**
 * Оновлює дані курсу користувача.
 */
export function updateCourse(db, userId, courseId, payload) {
  const existing = getCourseById(db, userId, courseId);

  let nextAreaId = existing.area_id;
  if (payload.area_id !== undefined) {
    const area = getAreaById(db, userId, payload.area_id);
    nextAreaId = area.id;
  }

  const nextTitle = payload.title !== undefined ? String(payload.title).trim() : existing.title;
  const nextDesc =
    payload.description !== undefined ? String(payload.description).trim() : existing.description;
  const nextStart =
    payload.start_date !== undefined ? String(payload.start_date).trim() : existing.start_date;
  const nextEnd =
    payload.end_date !== undefined ? String(payload.end_date).trim() : existing.end_date;

  if (nextTitle.length < 2 || nextTitle.length > 100) {
    throw new AppError('Назва курсу має містити від 2 до 100 символів.', 400);
  }
  if (!isValidDateString(nextStart) || !isValidDateString(nextEnd)) {
    throw new AppError('Вкажіть коректні дати початку та завершення курсу.', 400);
  }
  if (new Date(nextEnd) < new Date(nextStart)) {
    throw new AppError('Дата завершення курсу не може бути раніше дати початку.', 400);
  }

  db.prepare(`
    UPDATE courses
    SET area_id = ?, title = ?, description = ?, start_date = ?, end_date = ?
    WHERE id = ? AND user_id = ?
  `).run(nextAreaId, nextTitle, nextDesc, nextStart, nextEnd, existing.id, userId);

  return getCourseById(db, userId, existing.id);
}

/**
 * Видаляє курс користувача.
 */
export function deleteCourse(db, userId, courseId) {
  const existing = getCourseById(db, userId, courseId);
  db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(existing.id, userId);
  return { deleted: true, id: existing.id };
}
