import {
  createTask,
  deleteTask,
  getTaskById,
  getUpcomingTasks,
  listTasks,
  renewTask,
  updateTask,
} from '../services/taskService.js';

export function getAll(req, res, next) {
  try {
    const tasks = listTasks(req.app.locals.db, req.user.id, req.query);
    return res.status(200).json(tasks);
  } catch (err) {
    return next(err);
  }
}

export function getUpcoming(req, res, next) {
  try {
    const days = req.query.days ? Number(req.query.days) : 3;
    const tasks = getUpcomingTasks(req.app.locals.db, req.user.id, days);
    return res.status(200).json(tasks);
  } catch (err) {
    return next(err);
  }
}

export function getOne(req, res, next) {
  try {
    const task = getTaskById(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
}

export function create(req, res, next) {
  try {
    const task = createTask(req.app.locals.db, req.user.id, req.body || {});
    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
}

export function update(req, res, next) {
  try {
    const task = updateTask(req.app.locals.db, req.user.id, req.params.id, req.body || {});
    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
}

export function renew(req, res, next) {
  try {
    const task = renewTask(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
}

export function remove(req, res, next) {
  try {
    const result = deleteTask(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
