import { Router } from 'express';
import {
  getIntegrations,
  regenerateTelegramCode,
  simulateTelegramBot,
  telegramWebhook,
  testEmailNotification,
  testTelegramNotification,
  updateIntegrations,
} from '../controllers/integrationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/telegram/webhook', telegramWebhook);

router.use(authenticateToken);
router.get('/', getIntegrations);
router.put('/', updateIntegrations);
router.post('/telegram/regenerate-code', regenerateTelegramCode);
router.post('/telegram/simulate', simulateTelegramBot);
router.post('/test-email', testEmailNotification);
router.post('/test-telegram', testTelegramNotification);

export default router;
