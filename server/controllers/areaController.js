import {
  createArea,
  deleteArea,
  getAreaById,
  listAreas,
  updateArea,
} from '../services/areaService.js';

export function getAll(req, res, next) {
  try {
    const areas = listAreas(req.app.locals.db, req.user.id);
    return res.status(200).json(areas);
  } catch (err) {
    return next(err);
  }
}

export function getOne(req, res, next) {
  try {
    const area = getAreaById(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(area);
  } catch (err) {
    return next(err);
  }
}

export function create(req, res, next) {
  try {
    const area = createArea(req.app.locals.db, req.user.id, req.body || {});
    return res.status(201).json(area);
  } catch (err) {
    return next(err);
  }
}

export function update(req, res, next) {
  try {
    const area = updateArea(req.app.locals.db, req.user.id, req.params.id, req.body || {});
    return res.status(200).json(area);
  } catch (err) {
    return next(err);
  }
}

export function remove(req, res, next) {
  try {
    const result = deleteArea(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
