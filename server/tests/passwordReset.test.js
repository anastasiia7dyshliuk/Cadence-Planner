import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../app.js';
import { initDb } from '../db/database.js';

describe('Відновлення пароля через одноразовий код', () => {
    let db;
    let app;
    const email = 'olha@study.ua';

    // Підставляємо відомий код, бо справжній код генерується випадково
    async function setKnownCode(code) {
        const hash = await bcrypt.hash(code, 10);
        db.prepare(
            'UPDATE password_resets SET code_hash = ? WHERE id = (SELECT MAX(id) FROM password_resets)'
        ).run(hash);
    }

    beforeEach(async () => {
        db = initDb(':memory:');
        app = createApp(db);
        await request(app).post('/api/auth/register').send({
            name: 'Ольга Петренко',
            email,
            password: 'OldPassword1',
        });
    });

    afterEach(() => {
        db.close();
    });

    test('для неіснуючої пошти відповідь така сама, але код не створюється', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'nobody@study.ua' });

        expect(res.status).toBe(200);
        const count = db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n;
        expect(count).toBe(0);
    });

    test('правильний код змінює пароль: новий працює, старий ні', async () => {
        await request(app).post('/api/auth/forgot-password').send({ email });
        await setKnownCode('123456');

        const resetRes = await request(app)
            .post('/api/auth/reset-password')
            .send({ email, code: '123456', newPassword: 'NewPassword2' });
        expect(resetRes.status).toBe(200);

        const oldLogin = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'OldPassword1' });
        expect(oldLogin.status).toBe(401);

        const newLogin = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'NewPassword2' });
        expect(newLogin.status).toBe(200);
    });

    test('неправильний код відхиляється, а використаний код не спрацює вдруге', async () => {
        await request(app).post('/api/auth/forgot-password').send({ email });
        await setKnownCode('123456');

        const wrong = await request(app)
            .post('/api/auth/reset-password')
            .send({ email, code: '000000', newPassword: 'NewPassword2' });
        expect(wrong.status).toBe(400);

        const ok = await request(app)
            .post('/api/auth/reset-password')
            .send({ email, code: '123456', newPassword: 'NewPassword2' });
        expect(ok.status).toBe(200);

        const again = await request(app)
            .post('/api/auth/reset-password')
            .send({ email, code: '123456', newPassword: 'AnotherPass3' });
        expect(again.status).toBe(400);
    });

    test('повторний запит коду частіше ніж раз на хвилину блокується (429)', async () => {
        const first = await request(app).post('/api/auth/forgot-password').send({ email });
        expect(first.status).toBe(200);

        const second = await request(app).post('/api/auth/forgot-password').send({ email });
        expect(second.status).toBe(429);
    });
});
