import request from 'supertest';
import { createApp } from '../app.js';
import { initDb } from '../db/database.js';

describe('API інтеграційні тести (Auth, Areas, Courses, Tasks)', () => {
  let db;
  let app;

  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  test('Заборона доступу до захищених маршрутів без токена (401)', async () => {
    const resTasks = await request(app).get('/api/tasks');
    expect(resTasks.status).toBe(401);

    const resAreas = await request(app).get('/api/areas');
    expect(resAreas.status).toBe(401);
  });

  test('Реєстрація створює користувача, стартові 5 сфер і повертає JWT-токен', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Тарас Шевченко',
      email: 'taras@study.ua',
      password: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('taras@study.ua');

    const areasRes = await request(app)
      .get('/api/areas')
      .set('Authorization', `Bearer ${res.body.token}`);

    expect(areasRes.status).toBe(200);
    expect(areasRes.body).toHaveLength(5);
    expect(areasRes.body.map((a) => a.name)).toContain('Коледж');
  });

  test('Логін, створення курсу та завдання, отримання списку завдань', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Марія Коваль',
      email: 'maria@study.ua',
      password: 'StrongPassword8',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'maria@study.ua',
      password: 'StrongPassword8',
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const areasRes = await request(app)
      .get('/api/areas')
      .set('Authorization', `Bearer ${token}`);
    const firstAreaId = areasRes.body[0].id;

    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        area_id: firstAreaId,
        title: 'Веброзробка React',
        description: 'Практичний курс',
        start_date: '2026-11-01',
        end_date: '2026-12-30',
      });

    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body.id;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: courseId,
        title: 'Зробити модуль тестування',
        description: 'Написати supertest сценарії',
        deadline: tomorrow,
        priority: 'high',
        status: 'todo',
        recurrence: 'weekly',
      });

    expect(taskRes.status).toBe(201);
    expect(taskRes.body.title).toBe('Зробити модуль тестування');
    expect(taskRes.body.recurrence).toBe('weekly');

    await request(app)
      .put(`/api/tasks/${taskRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });

    const renewRes = await request(app)
      .post(`/api/tasks/${taskRes.body.id}/renew`)
      .set('Authorization', `Bearer ${token}`);

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.status).toBe('todo');
    expect(new Date(renewRes.body.deadline).getTime()).toBeGreaterThan(new Date(tomorrow).getTime());

    const listRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].course_title).toBe('Веброзробка React');
  });

  test('Оновлення профілю (PUT /api/auth/me) змінює ім’я, біо та аватар і блокує небезпечні URL', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Анна Іваненко',
      email: 'anna@study.ua',
      password: 'Password123',
    });

    const token = regRes.body.token;

    const updateRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Анна Петренко',
        email: 'anna.p@study.ua',
        bio: 'Студентка · UI/UX та FullStack',
        avatar_url: 'preset:fuchsia',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('Анна Петренко');
    expect(updateRes.body.user.email).toBe('anna.p@study.ua');
    expect(updateRes.body.user.bio).toBe('Студентка · UI/UX та FullStack');
    expect(updateRes.body.user.avatar_url).toBe('preset:fuchsia');

    const badAvatarRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        avatar_url: 'javascript:alert(1)',
      });

    expect(badAvatarRes.status).toBe(400);
  });

  test('Налаштування Email та Telegram-бота Cadence Pulse (/api/integrations)', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Максим Дорошенко',
      email: 'maksym@study.ua',
      password: 'Password123',
    });

    const token = regRes.body.token;

    const getRes = await request(app)
      .get('/api/integrations')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.preferences.email_enabled).toBe(true);
    expect(getRes.body.preferences.telegram_link_code).toMatch(/^CAD-/);
    expect(getRes.body.capabilities.botName).toBe('Cadence Pulse');
    expect(getRes.body.capabilities.botDeepLink).toContain('https://t.me/');

    const putRes = await request(app)
      .put('/api/integrations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email_enabled: true,
        notification_email: 'alerts@study.ua',
        telegram_enabled: true,
        telegram_username: 'maksym_study',
        telegram_chat_id: '123456789',
        reminder_hours_before: 12,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.preferences.notification_email).toBe('alerts@study.ua');
    expect(putRes.body.preferences.telegram_username).toBe('@maksym_study');
    expect(putRes.body.preferences.telegram_chat_id).toBe('123456789');
    expect(putRes.body.preferences.reminder_hours_before).toBe(12);

    const tgTestRes = await request(app)
      .post('/api/integrations/test-telegram')
      .set('Authorization', `Bearer ${token}`)
      .send({ telegram_username: '@anastasiia_test', lang: 'uk' });

    expect(tgTestRes.status).toBe(200);
    expect(tgTestRes.body.targetHandle).toBe('@anastasiia_test');
    expect(tgTestRes.body.deepLink).toContain('https://t.me/');

    const simRes = await request(app)
      .post('/api/integrations/telegram/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send({ command: '/support', lang: 'uk' });

    expect(simRes.status).toBe(200);
    expect(simRes.body.pinnedMessage).toContain('Cadence Planner');
  });
});
