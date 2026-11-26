import { buildStatsPayload } from '../services/progressService.js';

/**
 * Повертає зведену статистику прогресу для графіків і лічильників.
 */
export function getStats(req, res, next) {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;

    const areas = db
      .prepare('SELECT id, name, color, icon FROM areas WHERE user_id = ? ORDER BY id ASC')
      .all(userId);

    const courses = db
      .prepare('SELECT id, area_id, title, start_date, end_date FROM courses WHERE user_id = ? ORDER BY id ASC')
      .all(userId);

    const tasks = db
      .prepare('SELECT id, course_id, title, deadline, priority, status, completed_at FROM tasks WHERE user_id = ?')
      .all(userId);

    const stats = buildStatsPayload({ areas, courses, tasks, now: new Date() });
    return res.status(200).json(stats);
  } catch (err) {
    return next(err);
  }
}
