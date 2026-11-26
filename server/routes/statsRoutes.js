import { Router } from 'express';
import { getStats } from '../controllers/statsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getStats);

export default router;
