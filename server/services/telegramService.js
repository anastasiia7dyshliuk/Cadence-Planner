import crypto from 'crypto';
import { getWebAppUrl } from './emailService.js';

export const BOT_NAME = 'Cadence Pulse';
export const DEFAULT_BOT_USERNAME = 'cadence_pulse_bot';

export function getBotUsername() {
  const raw = process.env.TELEGRAM_BOT_USERNAME;
  return raw && raw.trim() ? raw.trim().replace(/^@/, '') : DEFAULT_BOT_USERNAME;
}

export function getBotDeepLink(linkCode = '') {
  const botUsername = getBotUsername();
  return linkCode
    ? `https://t.me/${botUsername}?start=${encodeURIComponent(linkCode)}`
    : `https://t.me/${botUsername}`;
}

export function normalizeTelegramUsername(raw = '') {
  const cleaned = String(raw || '').trim().replace(/^@+/, '');
  if (!cleaned) return '';
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleaned)) {
    return null;
  }
  return `@${cleaned}`;
}

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 10);
}

export function generateLinkCode() {
  return `CAD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Створює або повертає налаштування сповіщень користувача.
 */
export function getOrCreateNotificationPrefs(db, userId, defaultEmail = '') {
  let row = db
    .prepare('SELECT * FROM notification_preferences WHERE user_id = ?')
    .get(userId);

  if (!row) {
    const linkCode = generateLinkCode();
    db.prepare(
      `INSERT INTO notification_preferences
       (user_id, email_enabled, notification_email, telegram_enabled, telegram_link_code, reminder_hours_before)
       VALUES (?, 1, ?, 0, ?, 24)`
    ).run(userId, defaultEmail, linkCode);

    row = db
      .prepare('SELECT * FROM notification_preferences WHERE user_id = ?')
      .get(userId);
  } else if (!row.telegram_link_code) {
    const linkCode = generateLinkCode();
    db.prepare('UPDATE notification_preferences SET telegram_link_code = ? WHERE user_id = ?').run(
      linkCode,
      userId
    );
    row.telegram_link_code = linkCode;
  }

  return {
    email_enabled: Boolean(row.email_enabled),
    notification_email: row.notification_email || defaultEmail,
    telegram_enabled: Boolean(row.telegram_enabled),
    telegram_chat_id: row.telegram_chat_id || '',
    telegram_username: row.telegram_username || '',
    telegram_link_code: row.telegram_link_code,
    reminder_hours_before: Number(row.reminder_hours_before || 24),
  };
}

/**
 * Формує текст закріпленого повідомлення з посиланням на вебзастосунок Cadence Planner.
 */
export function buildPinnedMessage(lang = 'uk') {
  const url = getWebAppUrl();
  if (lang === 'en') {
    return (
      `📌 Cadence Pulse — Your Study & Rhythm Companion\n` +
      `Open Cadence Planner anytime: ${url}\n` +
      `Commands: /deadlines · /today · /support · /pin`
    );
  }
  return (
    `📌 Cadence Pulse — твій бот-помічник ритму та дедлайнів\n` +
    `Посилання на вебзастосунок Cadence Planner: ${url}\n` +
    `Команди: /deadlines · /today · /support · /pin`
  );
}

const SUPPORT_TIPS_UK = [
  'Маленькі кроки щодня сильніші за марафон в останню ніч. Оберіть 1 задачу на найближчі 25 хвилин!',
  'Твій ритм — це не гонитва. Закрий одне просте завдання, щоб відчути легкий імпульс руху вперед.',
  'Після 45 хвилин навчання зроби 5 хвилин перерви без екрана — мозок закріпить матеріал значно краще.',
];

const SUPPORT_TIPS_EN = [
  'Small steady steps beat last-minute marathons. Pick just one task for the next 25 minutes!',
  'Your cadence is not a race. Finish one manageable task first to build calm momentum.',
  'Take a 5-minute screen-free breather after 45 minutes of focus—your memory consolidates faster.',
];

/**
 * Генерує відповідь бота Cadence Pulse на команду користувача (без ШІ, на основі даних SQLite).
 */
export function buildBotCommandReply(db, user, commandText = '/start', lang = 'uk') {
  const cmd = String(commandText || '/start').trim().split(/\s+/)[0].toLowerCase();
  const isEn = lang === 'en';
  const url = getWebAppUrl();
  const nowIso = new Date().toISOString();
  const horizonIso = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const tasks = db
    .prepare(
      `SELECT t.title, t.deadline, t.priority, t.status, c.title AS course_title
       FROM tasks t
       JOIN courses c ON c.id = t.course_id
       WHERE t.user_id = ? AND t.status != 'done'
       ORDER BY t.deadline ASC`
    )
    .all(user.id);

  const overdue = tasks.filter((t) => t.deadline < nowIso);
  const upcoming = tasks.filter((t) => t.deadline >= nowIso && t.deadline <= horizonIso);

  if (cmd === '/start' || cmd === '/pin') {
    const pinnedText = buildPinnedMessage(lang);
    const intro = isEn
      ? `Hey ${user.name.split(' ')[0]}! I'm Cadence Pulse, your personal study reminder & support buddy.\n\n` +
        `I'll nudge you gently before deadlines and keep the quick link to Cadence Planner pinned right at the top:\n${url}`
      : `Привіт, ${user.name.split(' ')[0]}! Я Cadence Pulse — твій дружній бот-нагадувальник і підтримка.\n\n` +
        `Я нагадуватиму про дедлайни та триматиму у закрепі швидке посилання на Cadence Planner:\n${url}`;
    return { reply: intro, pinnedText, shouldPin: true };
  }

  if (cmd === '/deadlines') {
    if (upcoming.length === 0 && overdue.length === 0) {
      return {
        reply: isEn
          ? `All clear! You have 0 urgent or overdue tasks right now. Keep enjoying your steady rhythm! ✨\nOpen planner: ${url}`
          : `Усе чисто! Термінових чи прострочених завдань зараз немає. Чудовий ритм! ✨\nВідкрити планувальник: ${url}`,
        shouldPin: false,
      };
    }

    const lines = [];
    if (overdue.length > 0) {
      lines.push(isEn ? `⚠️ Overdue (${overdue.length}):` : `⚠️ Прострочені (${overdue.length}):`);
      overdue.slice(0, 3).forEach((t) => lines.push(`• ${t.title} (${t.course_title})`));
    }
    if (upcoming.length > 0) {
      lines.push(
        isEn ? `⏰ Due within 3 days (${upcoming.length}):` : `⏰ Найближчі 3 дні (${upcoming.length}):`
      );
      upcoming.slice(0, 4).forEach((t) => {
        const dt = new Date(t.deadline).toLocaleString(isEn ? 'en-US' : 'uk-UA', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(`• ${t.title} — ${dt}`);
      });
    }
    lines.push(`\n🔗 ${url}`);
    return { reply: lines.join('\n'), shouldPin: false };
  }

  if (cmd === '/today') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const events = db
      .prepare(
        `SELECT title, start_datetime, end_datetime
         FROM events
         WHERE user_id = ? AND (substr(start_datetime, 1, 10) = ? OR recurrence = 'weekly')
         ORDER BY start_datetime ASC`
      )
      .all(user.id, todayStr);

    if (events.length === 0) {
      return {
        reply: isEn
          ? `No scheduled sessions on today's calendar—great space for deep focus or rest.\n🔗 ${url}`
          : `На сьогодні в календарі немає запланованих занять — чудовий час для глибокого фокусу або відпочинку.\n🔗 ${url}`,
        shouldPin: false,
      };
    }

    const evLines = events.slice(0, 5).map((ev) => {
      const time = new Date(ev.start_datetime).toLocaleTimeString(isEn ? 'en-US' : 'uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `• ${time} — ${ev.title}`;
    });
    return {
      reply:
        (isEn ? `📅 Today's schedule:\n` : `📅 Заняття на сьогодні:\n`) +
        evLines.join('\n') +
        `\n\n🔗 ${url}`,
      shouldPin: false,
    };
  }

  if (cmd === '/support') {
    const tips = isEn ? SUPPORT_TIPS_EN : SUPPORT_TIPS_UK;
    const tip = tips[new Date().getMinutes() % tips.length];
    const nextTask = upcoming[0] || tasks[0];
    const encouragement = nextTask
      ? isEn
        ? `\n\nSuggested next step: «${nextTask.title}» (${nextTask.course_title}). You've got this!`
        : `\n\nНаступний спокійний крок: «${nextTask.title}» (${nextTask.course_title}). У тебе все вийде!`
      : '';
    return {
      reply: `💙 ${tip}${encouragement}\n\n🔗 ${url}`,
      shouldPin: false,
    };
  }

  return {
    reply: isEn
      ? `Available commands:\n/deadlines — upcoming & overdue tasks\n/today — today's sessions\n/support — gentle study motivation\n/pin — pinned Cadence Planner link`
      : `Доступні команди:\n/deadlines — найближчі та прострочені задачі\n/today — розклад занять на сьогодні\n/support — підтримка та порада для фокусу\n/pin — закріплене посилання на Cadence Planner`,
    shouldPin: false,
  };
}

/**
 * Надсилає реальне повідомлення через Telegram Bot API (якщо задано TELEGRAM_BOT_TOKEN).
 */
export async function sendTelegramBotMessage(chatId, text, { pin = false } = {}) {
  if (!isTelegramConfigured() || !chatId) {
    return { delivered: false, mode: 'preview' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN.trim();
  const baseUrl = `https://api.telegram.org/bot${token}`;

  const resp = await fetch(`${baseUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.ok) {
    throw new Error(data.description || 'Telegram API error');
  }

  if (pin && data.result?.message_id) {
    await fetch(`${baseUrl}/pinChatMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: data.result.message_id,
        disable_notification: true,
      }),
    }).catch(() => {
      // Безпечно ігноруємо, якщо в приватному чаті користувач вимкнув закріплення
    });
  }

  return { delivered: true, mode: 'telegram', messageId: data.result?.message_id };
}

/**
 * Шукає chat_id користувача через getUpdates за кодом /start CAD-... або @username.
 */
export async function discoverChatIdFromUpdates({ linkCode = '', username = '' } = {}) {
  if (!isTelegramConfigured()) return null;

  const token = process.env.TELEGRAM_BOT_TOKEN.trim();
  const cleanUser = String(username || '').replace(/^@+/, '').toLowerCase();
  const cleanCode = String(linkCode || '').trim().toUpperCase();

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.ok || !Array.isArray(data.result)) return null;

    // Перевіряємо з найсвіжіших повідомлень
    for (let i = data.result.length - 1; i >= 0; i -= 1) {
      const msg = data.result[i]?.message;
      if (!msg?.chat?.id) continue;

      const msgText = String(msg.text || '').trim().toUpperCase();
      const msgUser = String(msg.from?.username || '').toLowerCase();

      const matchedByCode = cleanCode && msgText.includes(cleanCode);
      const matchedByUsername = cleanUser && msgUser && msgUser === cleanUser;

      if (matchedByCode || matchedByUsername) {
        return {
          chatId: String(msg.chat.id),
          username: msg.from?.username ? `@${msg.from.username}` : username,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}
