import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.js';
import { initDb } from './server/db/database.js';
import { seedDatabase } from './server/db/seed.js';
import { startBotAndReminderServices } from './server/services/telegramBotRunner.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const db = initDb();
  await seedDatabase(db);
  startBotAndReminderServices(db);

  // Не монтуємо /api 404 одразу, поки не додамо Vite/статичні маршрути
  const app = createApp(db, { mountNotFound: true });

  // Віддаємо згенеровані зображення з /src/assets/images
  const assetsDir = path.resolve(__dirname, 'src', 'assets');
  if (fs.existsSync(assetsDir)) {
    app.use('/src/assets', express.static(assetsDir));
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Повноцінний вебзастосунок запущено на http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Помилка запуску сервера:', err);
  process.exit(1);
});
