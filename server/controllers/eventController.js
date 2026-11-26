import {
  createEvent,
  deleteEvent,
  getEventById,
  listEvents,
  updateEvent,
} from '../services/eventService.js';

export function getAll(req, res, next) {
  try {
    const events = listEvents(req.app.locals.db, req.user.id);
    return res.status(200).json(events);
  } catch (err) {
    return next(err);
  }
}

export function getOne(req, res, next) {
  try {
    const event = getEventById(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(event);
  } catch (err) {
    return next(err);
  }
}

export function create(req, res, next) {
  try {
    const event = createEvent(req.app.locals.db, req.user.id, req.body || {});
    return res.status(201).json(event);
  } catch (err) {
    return next(err);
  }
}

export function update(req, res, next) {
  try {
    const event = updateEvent(req.app.locals.db, req.user.id, req.params.id, req.body || {});
    return res.status(200).json(event);
  } catch (err) {
    return next(err);
  }
}

export function remove(req, res, next) {
  try {
    const result = deleteEvent(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
