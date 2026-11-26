import cors from 'cors';
import express from 'express';
import areaRoutes from './routes/areaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { AppError } from './utils/errors.js';

/**
 * Створює та конфігурує Express-застосунок без прив'язки до конкретного порту.
 * Зручно як для продакшн/dev-сервера, так і для інтеграційних тестів supertest.
 */
export function createApp(db, { mountNotFound = true } = {}) {
  const app = express();
  app.locals.db = db;

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, origin);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/areas', areaRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/integrations', integrationRoutes);

  if (mountNotFound) {
    app.use('/api', (_req, res) => {
      res.status(404).json({ message: 'Маршрут API не знайдено.' });
    });
  }

  // Глобальний обробник помилок API
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Некоректний формат JSON у тілі запиту.' });
    }
    console.error('Внутрішня помилка сервера:', err);
    return res.status(500).json({ message: 'Внутрішня помилка сервера. Спробуйте пізніше.' });
  });

  return app;
}
