import { AppError, parseId } from '../utils/errors.js';
import { getCourseById } from './courseService.js';
import { isTaskOverdue, resolveCompletedAt } from './progressService.js';

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_RECURRENCES = ['none', 'daily', 'weekly'];

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Додає прапорець простроченості до об'єкта завдання.
 */
function enrichTask(task, now = new Date()) {
  return {
    ...task,
    isOverdue: isTaskOverdue(task, now),
  };
}

/**
 * Повертає список завдань з підтримкою пошуку, фільтрації та сортування.
 */
export function listTasks(db, userId, query = {}) {
  const { search, areaId, courseId, status, priority, sort = 'deadline' } = query;

  let sql = `
    SELECT
      t.*,
      c.title AS course_title,
      c.area_id AS area_id,
      a.name AS area_name,
      a.color AS area_color
    FROM tasks t
    JOIN courses c ON c.id = t.course_id
    JOIN areas a ON a.id = c.area_id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (search && typeof search === 'string' && search.trim()) {
    sql += ' AND LOWER(t.title) LIKE ?';
    params.push(`%${search.trim().toLowerCase()}%`);
  }

  if (areaId !== undefined && areaId !== '' && areaId !== 'all') {
    const parsedAreaId = parseId(areaId, 'Ідентифікатор сфери');
    sql += ' AND c.area_id = ?';
    params.push(parsedAreaId);
  }

  if (courseId !== undefined && courseId !== '' && courseId !== 'all') {
    const parsedCourseId = parseId(courseId, 'Ідентифікатор курсу');
    sql += ' AND t.course_id = ?';
    params.push(parsedCourseId);
  }

  if (status && status !== 'all') {
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError('Некоректний статус завдання.', 400);
    }
    sql += ' AND t.status = ?';
    params.push(status);
  }

  if (priority && priority !== 'all') {
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new AppError('Некоректний пріоритет завдання.', 400);
    }
    sql += ' AND t.priority = ?';
    params.push(priority);
  }

  if (sort === 'priority') {
    sql += `
      ORDER BY
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END ASC,
        t.deadline ASC
    `;
  } else if (sort === 'created') {
    sql += ' ORDER BY t.created_at DESC, t.id DESC';
  } else {
    sql += ' ORDER BY t.deadline ASC, t.id ASC';
  }

  const rows = db.prepare(sql).all(...params);
  const now = new Date();
  return rows.map((row) => enrichTask(row, now));
}

/**
 * Повертає найближчі невиконані завдання на N днів уперед.
 */
export function getUpcomingTasks(db, userId, days = 3) {
  const numDays = Number(days);
  const safeDays = Number.isFinite(numDays) && numDays > 0 && numDays <= 60 ? numDays : 3;

  const now = new Date();
  const future = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);

  const rows = db
    .prepare(`
      SELECT
        t.*,
        c.title AS course_title,
        c.area_id AS area_id,
        a.name AS area_name,
        a.color AS area_color
      FROM tasks t
      JOIN courses c ON c.id = t.course_id
      JOIN areas a ON a.id = c.area_id
      WHERE t.user_id = ?
        AND t.status != 'done'
        AND datetime(t.deadline) >= datetime(?)
        AND datetime(t.deadline) <= datetime(?)
      ORDER BY t.deadline ASC
    `)
    .all(userId, now.toISOString(), future.toISOString());

  return rows.map((row) => enrichTask(row, now));
}

/**
 * Повертає одне завдання користувача з перевіркою доступу.
 */
export function getTaskById(db, userId, taskId) {
  const id = parseId(taskId, 'Ідентифікатор завдання');
  const row = db
    .prepare(`
      SELECT
        t.*,
        c.title AS course_title,
        c.area_id AS area_id,
        a.name AS area_name,
        a.color AS area_color
      FROM tasks t
      JOIN courses c ON c.id = t.course_id
      JOIN areas a ON a.id = c.area_id
      WHERE t.id = ?
    `)
    .get(id);

  if (!row) {
    throw new AppError('Завдання не знайдено.', 404);
  }
  if (row.user_id !== userId) {
    throw new AppError('Немає доступу до цього завдання.', 403);
  }

  return enrichTask(row);
}

/**
 * Створює нове завдання з перевіркою курсу, дедлайну й пріоритету.
 */
export function createTask(
  db,
  userId,
  {
    course_id,
    title,
    description = '',
    deadline,
    priority = 'medium',
    status = 'todo',
    recurrence = 'none',
  }
) {
  const course = getCourseById(db, userId, course_id);
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (cleanTitle.length < 2 || cleanTitle.length > 100) {
    throw new AppError('Назва завдання має містити від 2 до 100 символів.', 400);
  }
  if (!isValidIsoDate(deadline)) {
    throw new AppError('Вкажіть коректну дату та час дедлайну.', 400);
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  if (deadlineDate.getTime() < now.getTime() - 60 * 1000) {
    throw new AppError('Дедлайн нового завдання не може бути у минулому.', 400);
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    throw new AppError('Пріоритет має бути low, medium або high.', 400);
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError('Статус має бути todo, in_progress або done.', 400);
  }
  if (!VALID_RECURRENCES.includes(recurrence)) {
    throw new AppError('Повторення має бути none, daily або weekly.', 400);
  }

  const completedAt = resolveCompletedAt(status, null, now);

  const res = db
    .prepare(`
      INSERT INTO tasks (user_id, course_id, title, description, deadline, priority, status, recurrence, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      userId,
      course.id,
      cleanTitle,
      cleanDesc,
      deadlineDate.toISOString(),
      priority,
      status,
      recurrence,
      completedAt
    );

  return getTaskById(db, userId, res.lastInsertRowid);
}

/**
 * Оновлює завдання та автоматично керує полем completed_at при зміні статусу.
 */
export function updateTask(db, userId, taskId, payload) {
  const existing = getTaskById(db, userId, taskId);

  let nextCourseId = existing.course_id;
  if (payload.course_id !== undefined) {
    const course = getCourseById(db, userId, payload.course_id);
    nextCourseId = course.id;
  }

  const nextTitle = payload.title !== undefined ? String(payload.title).trim() : existing.title;
  const nextDesc =
    payload.description !== undefined ? String(payload.description).trim() : existing.description;
  const nextPriority = payload.priority !== undefined ? payload.priority : existing.priority;
  const nextStatus = payload.status !== undefined ? payload.status : existing.status;
  const nextRecurrence =
    payload.recurrence !== undefined ? payload.recurrence : existing.recurrence || 'none';

  let nextDeadline = existing.deadline;
  if (payload.deadline !== undefined) {
    if (!isValidIsoDate(payload.deadline)) {
      throw new AppError('Вкажіть коректну дату та час дедлайну.', 400);
    }
    nextDeadline = new Date(payload.deadline).toISOString();
  }

  if (nextTitle.length < 2 || nextTitle.length > 100) {
    throw new AppError('Назва завдання має містити від 2 до 100 символів.', 400);
  }
  if (!VALID_PRIORITIES.includes(nextPriority)) {
    throw new AppError('Пріоритет має бути low, medium або high.', 400);
  }
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new AppError('Статус має бути todo, in_progress або done.', 400);
  }
  if (!VALID_RECURRENCES.includes(nextRecurrence)) {
    throw new AppError('Повторення має бути none, daily або weekly.', 400);
  }

  const nextCompletedAt = resolveCompletedAt(nextStatus, existing.completed_at, new Date());

  db.prepare(`
    UPDATE tasks
    SET course_id = ?, title = ?, description = ?, deadline = ?, priority = ?, status = ?, recurrence = ?, completed_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextCourseId,
    nextTitle,
    nextDesc,
    nextDeadline,
    nextPriority,
    nextStatus,
    nextRecurrence,
    nextCompletedAt,
    existing.id,
    userId
  );

  return getTaskById(db, userId, existing.id);
}

/**
 * Поновлює регулярне або завершене завдання на наступний цикл (день/тиждень) без повторного створення.
 */
export function renewTask(db, userId, taskId) {
  const existing = getTaskById(db, userId, taskId);
  const stepDays = existing.recurrence === 'daily' ? 1 : 7;
  const stepMs = stepDays * 24 * 60 * 60 * 1000;

  let nextDeadlineMs = new Date(existing.deadline).getTime() + stepMs;
  const nowMs = Date.now();
  while (nextDeadlineMs <= nowMs) {
    nextDeadlineMs += stepMs;
  }

  const nextDeadlineIso = new Date(nextDeadlineMs).toISOString();

  db.prepare(`
    UPDATE tasks
    SET status = 'todo', completed_at = NULL, deadline = ?
    WHERE id = ? AND user_id = ?
  `).run(nextDeadlineIso, existing.id, userId);

  return getTaskById(db, userId, existing.id);
}

/**
 * Видаляє завдання користувача.
 */
export function deleteTask(db, userId, taskId) {
  const existing = getTaskById(db, userId, taskId);
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(existing.id, userId);
  return { deleted: true, id: existing.id };
}
