import { jest } from '@jest/globals';
import { sendMail, sendPasswordResetEmail } from '../services/emailService.js';

describe('emailService — вибір способу надсилання листів', () => {
    const savedEnv = { ...process.env };
    const savedFetch = global.fetch;

    beforeEach(() => {
        delete process.env.BREVO_API_KEY;
        delete process.env.EMAIL_FROM;
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
    });

    afterEach(() => {
        process.env = { ...savedEnv };
        global.fetch = savedFetch;
    });

    test('без налаштувань лист не надсилається, але й помилки немає', async () => {
        const result = await sendMail({ to: 'user@study.ua', subject: 'Тест', text: 'Тест', html: '<p>Тест</p>' });
        expect(result.delivered).toBe(false);
    });

    test('з ключем Brevo лист надсилається через HTTPS API потрібному отримувачу', async () => {
        process.env.BREVO_API_KEY = 'test-key';
        process.env.EMAIL_FROM = 'cadence.planner@gmail.com';
        // Підміняємо fetch, щоб не надсилати справжній запит в інтернет
        global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });

        const result = await sendPasswordResetEmail({
            to: 'student@study.ua',
            userName: 'Ольга',
            code: '123456',
            minutes: 15,
        });

        expect(result).toEqual({ delivered: true, mode: 'brevo' });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [url, options] = global.fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(url).toBe('https://api.brevo.com/v3/smtp/email');
        expect(options.headers['api-key']).toBe('test-key');
        expect(body.to[0].email).toBe('student@study.ua');
        expect(body.sender.email).toBe('cadence.planner@gmail.com');
        expect(body.textContent).toContain('123456');
    });

    test('помилка Brevo API передається далі, а не замовчується', async () => {
        process.env.BREVO_API_KEY = 'wrong-key';
        process.env.EMAIL_FROM = 'cadence.planner@gmail.com';
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Key not found' });

        await expect(
            sendMail({ to: 'user@study.ua', subject: 'Тест', text: 'Тест', html: '<p>Тест</p>' })
        ).rejects.toThrow('401');
    });
});
