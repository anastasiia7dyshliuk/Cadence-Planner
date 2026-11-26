import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../utils/errors.js';
import { sendPasswordResetEmail } from './emailService.js';
import { sendTelegramBotMessage } from './telegramService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Скільки хвилин діє код відновлення
export const RESET_CODE_TTL_MINUTES = 15;
// Скільки разів можна помилитися з кодом, перш ніж він стане недійсним
export const MAX_RESET_ATTEMPTS = 5;
// Мінімальна пауза між двома запитами коду (захист від спаму)
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Генерує випадковий 6-значний код (від 100000 до 999999).
 * crypto.randomInt використовує криптографічно стійкий генератор,
 * на відміну від Math.random().
 */
export function generateResetCode() {
    return String(crypto.randomInt(100000, 1000000));
}

/**
 * Крок 1: користувач вказує пошту, ми створюємо код і надсилаємо його.
 * Відповідь однакова, незалежно від того, чи існує така пошта,
 * щоб сторонні не могли перевіряти, хто зареєстрований у системі.
 */
export async function requestPasswordReset(db, { email, lang = 'uk' }, now = new Date()) {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new AppError('Введіть коректну електронну пошту.', 400);
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
        return { channels: [] };
    }

    // Не дозволяємо запитувати новий код частіше, ніж раз на хвилину
    const lastRequest = db
        .prepare('SELECT created_at FROM password_resets WHERE user_id = ? ORDER BY id DESC LIMIT 1')
        .get(user.id);
    if (lastRequest) {
        const lastTime = new Date(`${lastRequest.created_at}Z`).getTime();
        const secondsPassed = (now.getTime() - lastTime) / 1000;
        if (secondsPassed < RESEND_COOLDOWN_SECONDS) {
            throw new AppError('Код уже надіслано. Спробуйте ще раз за хвилину.', 429);
        }
    }

    // Попередні невикористані коди скасовуємо: діє лише останній
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MINUTES * 60 * 1000).toISOString();

    db.prepare(
        'INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, codeHash, expiresAt);

    const channels = await deliverResetCode(db, user, code, lang);
    return { channels };
}

/**
 * Надсилає код усіма доступними каналами: пошта та/або Telegram.
 * Якщо жоден канал не налаштований (локальна розробка) — виводить код у консоль сервера.
 */
async function deliverResetCode(db, user, code, lang) {
    const channels = [];

    try {
        const emailResult = await sendPasswordResetEmail({
            to: user.email,
            userName: user.name,
            code,
            minutes: RESET_CODE_TTL_MINUTES,
            lang,
        });
        if (emailResult.delivered) {
            channels.push('email');
        }
    } catch (err) {
        console.error('Не вдалося надіслати лист відновлення:', err.message);
    }

    const prefs = db
        .prepare('SELECT telegram_chat_id FROM notification_preferences WHERE user_id = ?')
        .get(user.id);
    if (prefs && prefs.telegram_chat_id) {
        try {
            const text =
                lang === 'en'
                    ? `🔐 Cadence Planner password reset code: ${code}\nValid for ${RESET_CODE_TTL_MINUTES} minutes. If you did not request it, just ignore this message.`
                    : `🔐 Код для відновлення пароля Cadence Planner: ${code}\nДіє ${RESET_CODE_TTL_MINUTES} хв. Якщо ви не запитували код — просто проігноруйте це повідомлення.`;
            const tgResult = await sendTelegramBotMessage(prefs.telegram_chat_id, text);
            if (tgResult.delivered) {
                channels.push('telegram');
            }
        } catch (err) {
            console.error('Не вдалося надіслати код у Telegram:', err.message);
        }
    }

    if (channels.length === 0) {
        console.log(`[Відновлення пароля] Код для ${user.email}: ${code} (пошта й Telegram не налаштовані)`);
    }

    return channels;
}

/**
 * Крок 2: користувач вводить код і новий пароль.
 */
export async function resetPassword(db, { email, code, newPassword }, now = new Date()) {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    const rawPassword = typeof newPassword === 'string' ? newPassword : '';

    if (!EMAIL_REGEX.test(cleanEmail) || !/^\d{6}$/.test(cleanCode)) {
        throw new AppError('Вкажіть пошту та 6-значний код.', 400);
    }
    if (rawPassword.length < 8) {
        throw new AppError('Пароль має містити щонайменше 8 символів.', 400);
    }

    const invalidCodeError = new AppError('Код недійсний або строк його дії минув.', 400);

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
        throw invalidCodeError;
    }

    const reset = db
        .prepare(
            'SELECT id, code_hash, expires_at, attempts FROM password_resets WHERE user_id = ? AND used = 0 ORDER BY id DESC LIMIT 1'
        )
        .get(user.id);

    if (!reset || new Date(reset.expires_at).getTime() < now.getTime()) {
        throw invalidCodeError;
    }

    if (reset.attempts >= MAX_RESET_ATTEMPTS) {
        db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);
        throw new AppError('Забагато невдалих спроб. Запросіть новий код.', 429);
    }

    const codeValid = await bcrypt.compare(cleanCode, reset.code_hash);
    if (!codeValid) {
        db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(reset.id);
        throw invalidCodeError;
    }

    // Код правильний: оновлюємо пароль і позначаємо код використаним (в одній транзакції)
    const newHash = await bcrypt.hash(rawPassword, 10);
    const applyTx = db.transaction(() => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
        db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);
    });
    applyTx();

    return { success: true };
}
