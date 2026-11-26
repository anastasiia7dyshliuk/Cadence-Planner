import dotenv from 'dotenv';
import { createApp } from './app.js';
import { initDb } from './db/database.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const PORT = Number(process.env.PORT || 5000);

async function bootstrap() {
  const db = initDb();
  await seedDatabase(db);

  const app = createApp(db);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер планування навчання запущено на порту ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Не вдалося запустити сервер:', err);
  process.exit(1);
});
