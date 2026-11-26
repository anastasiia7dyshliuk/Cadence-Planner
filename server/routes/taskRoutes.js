import { Router } from 'express';
import {
  create,
  getAll,
  getOne,
  getUpcoming,
  remove,
  renew,
  update,
} from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/upcoming', getUpcoming);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.post('/:id/renew', renew);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
