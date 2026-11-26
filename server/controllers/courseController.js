import {
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  updateCourse,
} from '../services/courseService.js';

export function getAll(req, res, next) {
  try {
    const courses = listCourses(req.app.locals.db, req.user.id, {
      areaId: req.query.areaId,
    });
    return res.status(200).json(courses);
  } catch (err) {
    return next(err);
  }
}

export function getOne(req, res, next) {
  try {
    const course = getCourseById(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(course);
  } catch (err) {
    return next(err);
  }
}

export function create(req, res, next) {
  try {
    const course = createCourse(req.app.locals.db, req.user.id, req.body || {});
    return res.status(201).json(course);
  } catch (err) {
    return next(err);
  }
}

export function update(req, res, next) {
  try {
    const course = updateCourse(req.app.locals.db, req.user.id, req.params.id, req.body || {});
    return res.status(200).json(course);
  } catch (err) {
    return next(err);
  }
}

export function remove(req, res, next) {
  try {
    const result = deleteCourse(req.app.locals.db, req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
