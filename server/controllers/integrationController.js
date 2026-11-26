import crypto from 'crypto';
import { getUserById } from '../services/authService.js';
import { getWebAppUrl, isSmtpConfigured, sendDeadlineReminderEmail } from '../services/emailService.js';
import {
  BOT_NAME,
  buildBotCommandReply,
  buildPinnedMessage,
  discoverChatIdFromUpdates,
  generateLinkCode,
  getBotDeepLink,
  getBotUsername,
  getOrCreateNotificationPrefs,
  isTelegramConfigured,
  normalizeTelegramUsername,
  sendTelegramBotMessage,
} from '../services/telegramService.js';
import { AppError } from '../utils/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAT_ID_REGEX = /^-?\d{3,20}$/;

function getUpcomingUserTasks(db, userId, hoursAhead = 24) {
  const nowIso = new Date().toISOString();
  const limitIso = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

  return db
    .prepare(
      `SELECT t.id, t.title, t.deadline, t.priority, t.status, c.title AS course_title
       FROM tasks t
       JOIN courses c ON c.id = t.course_id
       WHERE t.user_id = ? AND t.status != 'done' AND t.deadline >= ? AND t.deadline <= ?
       ORDER BY t.deadline ASC`
    )
    .all(userId, nowIso, limitIso);
}

export function getIntegrations(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    const prefs = getOrCreateNotificationPrefs(db, req.user.id, user.email);
    const lang = req.query.lang === 'en' ? 'en' : 'uk';

    return res.status(200).json({
      preferences: prefs,
      capabilities: {
        smtpConfigured: isSmtpConfigured(),
        telegramConfigured: isTelegramConfigured(),
        botName: BOT_NAME,
        botUsername: getBotUsername(),
        botDeepLink: getBotDeepLink(prefs.telegram_link_code),
        webAppUrl: getWebAppUrl(),
        pinnedMessage: buildPinnedMessage(lang),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export function updateIntegrations(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    const current = getOrCreateNotificationPrefs(db, req.user.id, user.email);

    const {
      email_enabled,
      notification_email,
      telegram_enabled,
      telegram_chat_id,
      telegram_username,
      reminder_hours_before,
    } = req.body || {};

    const nextEmailEnabled =
      email_enabled !== undefined ? Boolean(email_enabled) : current.email_enabled;
    const nextEmail =
      notification_email !== undefined
        ? String(notification_email || '').trim().toLowerCase()
        : current.notification_email;

    if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
      throw new AppError('Введіть коректну електронну пошту для сповіщень.', 400);
    }

    const nextTelegramEnabled =
      telegram_enabled !== undefined ? Boolean(telegram_enabled) : current.telegram_enabled;
    const nextChatId =
      telegram_chat_id !== undefined
        ? String(telegram_chat_id || '').trim()
        : current.telegram_chat_id;

    if (nextChatId && !CHAT_ID_REGEX.test(nextChatId)) {
      throw new AppError('Telegram Chat ID має складатися лише з цифр.', 400);
    }

    let nextUsername = current.telegram_username;
    if (telegram_username !== undefined) {
      const normalized = normalizeTelegramUsername(telegram_username);
      if (normalized === null) {
        throw new AppError(
          'Telegram username має містити 5–32 латинські літери, цифри або символ "_".',
          400
        );
      }
      nextUsername = normalized;
    }

    const nextHours =
      reminder_hours_before !== undefined
        ? Number(reminder_hours_before)
        : current.reminder_hours_before;

    if (!Number.isInteger(nextHours) || nextHours < 1 || nextHours > 72) {
      throw new AppError('Інтервал нагадування має бути від 1 до 72 годин.', 400);
    }

    db.prepare(
      `UPDATE notification_preferences
       SET email_enabled = ?,
           notification_email = ?,
           telegram_enabled = ?,
           telegram_chat_id = ?,
           telegram_username = ?,
           reminder_hours_before = ?,
           updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(
      nextEmailEnabled ? 1 : 0,
      nextEmail || user.email,
      nextTelegramEnabled ? 1 : 0,
      nextChatId,
      nextUsername,
      nextHours,
      req.user.id
    );

    const updated = getOrCreateNotificationPrefs(db, req.user.id, user.email);
    return res.status(200).json({ preferences: updated });
  } catch (err) {
    return next(err);
  }
}

export function regenerateTelegramCode(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    getOrCreateNotificationPrefs(db, req.user.id, user.email);

    const code = generateLinkCode();
    db.prepare(
      `UPDATE notification_preferences
       SET telegram_link_code = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(code, req.user.id);

    return res.status(200).json({
      telegram_link_code: code,
      botDeepLink: getBotDeepLink(code),
    });
  } catch (err) {
    return next(err);
  }
}

export async function testEmailNotification(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    const prefs = getOrCreateNotificationPrefs(db, req.user.id, user.email);
    const lang = req.body?.lang === 'en' ? 'en' : 'uk';
    const targetEmail = prefs.notification_email || user.email;

    const tasks = getUpcomingUserTasks(db, req.user.id, prefs.reminder_hours_before);
    const result = await sendDeadlineReminderEmail({
      to: targetEmail,
      userName: user.name,
      tasks,
      lang,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function testTelegramNotification(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    let prefs = getOrCreateNotificationPrefs(db, req.user.id, user.email);
    const lang = req.body?.lang === 'en' ? 'en' : 'uk';

    // Якщо користувач передав @username прямо з форми — зберігаємо його одразу
    if (req.body?.telegram_username !== undefined) {
      const normalized = normalizeTelegramUsername(req.body.telegram_username);
      if (normalized === null) {
        throw new AppError(
          'Telegram username має містити 5–32 латинські літери, цифри або символ "_".',
          400
        );
      }
      db.prepare(
        `UPDATE notification_preferences SET telegram_username = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(normalized, req.user.id);
      prefs = getOrCreateNotificationPrefs(db, req.user.id, user.email);
    }

    const { reply } = buildBotCommandReply(db, user, '/deadlines', lang);
    const pinContent = buildPinnedMessage(lang);
    const deepLink = getBotDeepLink(prefs.telegram_link_code);
    const targetHandle = prefs.telegram_username || (prefs.telegram_chat_id ? `ID ${prefs.telegram_chat_id}` : '');

    // Якщо токен бота налаштований, але chat_id ще немає — намагаємось знайти користувача в getUpdates
    if (isTelegramConfigured() && !prefs.telegram_chat_id) {
      const discovered = await discoverChatIdFromUpdates({
        linkCode: prefs.telegram_link_code,
        username: prefs.telegram_username,
      });
      if (discovered?.chatId) {
        db.prepare(
          `UPDATE notification_preferences
           SET telegram_chat_id = ?, telegram_username = ?, telegram_enabled = 1, updated_at = datetime('now')
           WHERE user_id = ?`
        ).run(discovered.chatId, discovered.username || prefs.telegram_username, req.user.id);
        prefs = getOrCreateNotificationPrefs(db, req.user.id, user.email);
      }
    }

    if (isTelegramConfigured() && prefs.telegram_chat_id) {
      await sendTelegramBotMessage(prefs.telegram_chat_id, reply);
      await sendTelegramBotMessage(prefs.telegram_chat_id, pinContent, { pin: true });
      return res.status(200).json({
        delivered: true,
        mode: 'telegram',
        targetHandle: prefs.telegram_username || prefs.telegram_chat_id,
        chatId: prefs.telegram_chat_id,
        deepLink,
        message: reply,
        pinnedMessage: pinContent,
      });
    }

    if (isTelegramConfigured() && !prefs.telegram_chat_id) {
      return res.status(200).json({
        delivered: false,
        mode: 'needs_start',
        targetHandle,
        deepLink,
        message: reply,
        pinnedMessage: pinContent,
      });
    }

    return res.status(200).json({
      delivered: false,
      mode: 'preview',
      targetHandle,
      deepLink,
      message: reply,
      pinnedMessage: pinContent,
    });
  } catch (err) {
    return next(err);
  }
}

export function simulateTelegramBot(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    const { command, lang } = req.body || {};
    const cleanCommand = typeof command === 'string' ? command.slice(0, 120) : '/start';
    const result = buildBotCommandReply(db, user, cleanCommand, lang === 'en' ? 'en' : 'uk');

    return res.status(200).json({
      botName: BOT_NAME,
      botUsername: getBotUsername(),
      reply: result.reply,
      pinnedMessage: result.pinnedText || buildPinnedMessage(lang === 'en' ? 'en' : 'uk'),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Вебхук для реального Telegram-бота (BotFather + TELEGRAM_BOT_TOKEN).
 */
export async function telegramWebhook(req, res, next) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret || expectedSecret.trim().length === 0) {
      return res.status(503).json({ message: 'Telegram webhook secret не налаштовано.' });
    }

    const incomingSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    const a = Buffer.from(incomingSecret);
    const b = Buffer.from(expectedSecret.trim());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ message: 'Недійсний секрет вебхука.' });
    }

    const db = req.app.locals.db;
    const msg = req.body?.message;
    if (!msg?.chat?.id || !msg?.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = String(msg.chat.id);
    const username = msg.from?.username ? `@${msg.from.username}` : '';
    const text = String(msg.text).trim();

    // Прив'язка по /start CAD-XXXXXX
    if (text.startsWith('/start ')) {
      const code = text.slice(7).trim().toUpperCase();
      const matched = db
        .prepare('SELECT user_id FROM notification_preferences WHERE telegram_link_code = ?')
        .get(code);

      if (matched) {
        db.prepare(
          `UPDATE notification_preferences
           SET telegram_chat_id = ?, telegram_username = ?, telegram_enabled = 1, updated_at = datetime('now')
           WHERE user_id = ?`
        ).run(chatId, username, matched.user_id);

        const user = getUserById(db, matched.user_id);
        const { reply, pinnedText } = buildBotCommandReply(db, user, '/start', 'uk');
        await sendTelegramBotMessage(chatId, reply);
        if (pinnedText) {
          await sendTelegramBotMessage(chatId, pinnedText, { pin: true });
        }
        return res.status(200).json({ ok: true });
      }
    }

    const prefRow = db
      .prepare('SELECT user_id FROM notification_preferences WHERE telegram_chat_id = ?')
      .get(chatId);

    if (!prefRow) {
      await sendTelegramBotMessage(
        chatId,
        'Привіт! Скопіюй команду /start <код> із розділу «Профіль» у Cadence Planner, щоб прив’язати свій акаунт.'
      );
      return res.status(200).json({ ok: true });
    }

    const user = getUserById(db, prefRow.user_id);
    const { reply, pinnedText, shouldPin } = buildBotCommandReply(db, user, text, 'uk');
    await sendTelegramBotMessage(chatId, reply);
    if (shouldPin && pinnedText) {
      await sendTelegramBotMessage(chatId, pinnedText, { pin: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
