import { AppError, parseId } from '../utils/errors.js';
import { getCourseById } from './courseService.js';

const VALID_RECURRENCE = ['none', 'weekly'];

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Повертає всі заплановані заняття/події користувача з інформацією про курс і сферу.
 */
export function listEvents(db, userId) {
  return db
    .prepare(`
      SELECT
        e.*,
        c.title AS course_title,
        c.area_id AS area_id,
        a.name AS area_name,
        a.color AS area_color
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN areas a ON a.id = c.area_id
      WHERE e.user_id = ?
      ORDER BY e.start_datetime ASC
    `)
    .all(userId);
}

/**
 * Повертає одну подію з перевіркою власника.
 */
export function getEventById(db, userId, eventId) {
  const id = parseId(eventId, 'Ідентифікатор події');
  const row = db
    .prepare(`
      SELECT
        e.*,
        c.title AS course_title,
        c.area_id AS area_id,
        a.name AS area_name,
        a.color AS area_color
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN areas a ON a.id = c.area_id
      WHERE e.id = ?
    `)
    .get(id);

  if (!row) {
    throw new AppError('Заняття не знайдено.', 404);
  }
  if (row.user_id !== userId) {
    throw new AppError('Немає доступу до цього заняття.', 403);
  }
  return row;
}

/**
 * Створює нове заняття або подію в розкладі.
 */
export function createEvent(
  db,
  userId,
  { course_id = null, title, start_datetime, end_datetime, recurrence = 'none' }
) {
  let validCourseId = null;
  if (course_id !== null && course_id !== '' && course_id !== undefined) {
    const course = getCourseById(db, userId, course_id);
    validCourseId = course.id;
  }

  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (cleanTitle.length < 2 || cleanTitle.length > 100) {
    throw new AppError('Назва заняття має містити від 2 до 100 символів.', 400);
  }
  if (!isValidIsoDate(start_datetime) || !isValidIsoDate(end_datetime)) {
    throw new AppError('Вкажіть коректний час початку та завершення заняття.', 400);
  }

  const startDate = new Date(start_datetime);
  const endDate = new Date(end_datetime);
  if (endDate.getTime() <= startDate.getTime()) {
    throw new AppError('Час завершення заняття має бути пізніше за початок.', 400);
  }

  if (!VALID_RECURRENCE.includes(recurrence)) {
    throw new AppError('Повторення має бути none або weekly.', 400);
  }

  const res = db
    .prepare(`
      INSERT INTO events (user_id, course_id, title, start_datetime, end_datetime, recurrence)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      userId,
      validCourseId,
      cleanTitle,
      startDate.toISOString(),
      endDate.toISOString(),
      recurrence
    );

  return getEventById(db, userId, res.lastInsertRowid);
}

/**
 * Оновлює дані заняття користувача.
 */
export function updateEvent(db, userId, eventId, payload) {
  const existing = getEventById(db, userId, eventId);

  let nextCourseId = existing.course_id;
  if (payload.course_id !== undefined) {
    if (payload.course_id === null || payload.course_id === '') {
      nextCourseId = null;
    } else {
      const course = getCourseById(db, userId, payload.course_id);
      nextCourseId = course.id;
    }
  }

  const nextTitle = payload.title !== undefined ? String(payload.title).trim() : existing.title;
  const nextStart =
    payload.start_datetime !== undefined ? payload.start_datetime : existing.start_datetime;
  const nextEnd =
    payload.end_datetime !== undefined ? payload.end_datetime : existing.end_datetime;
  const nextRecurrence =
    payload.recurrence !== undefined ? payload.recurrence : existing.recurrence;

  if (nextTitle.length < 2 || nextTitle.length > 100) {
    throw new AppError('Назва заняття має містити від 2 до 100 символів.', 400);
  }
  if (!isValidIsoDate(nextStart) || !isValidIsoDate(nextEnd)) {
    throw new AppError('Вкажіть коректний час початку та завершення заняття.', 400);
  }

  const startDate = new Date(nextStart);
  const endDate = new Date(nextEnd);
  if (endDate.getTime() <= startDate.getTime()) {
    throw new AppError('Час завершення заняття має бути пізніше за початок.', 400);
  }
  if (!VALID_RECURRENCE.includes(nextRecurrence)) {
    throw new AppError('Повторення має бути none або weekly.', 400);
  }

  db.prepare(`
    UPDATE events
    SET course_id = ?, title = ?, start_datetime = ?, end_datetime = ?, recurrence = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextCourseId,
    nextTitle,
    startDate.toISOString(),
    endDate.toISOString(),
    nextRecurrence,
    existing.id,
    userId
  );

  return getEventById(db, userId, existing.id);
}

/**
 * Видаляє заняття користувача.
 */
export function deleteEvent(db, userId, eventId) {
  const existing = getEventById(db, userId, eventId);
  db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(existing.id, userId);
  return { deleted: true, id: existing.id };
}
