import { getUserById } from './authService.js';
import { getWebAppUrl } from './emailService.js';
import {
  buildBotCommandReply,
  isTelegramConfigured,
  sendTelegramBotMessage,
} from './telegramService.js';

/**
 * Автоматичний сервіс Telegram-бота (Long Polling через getUpdates) та періодичних нагадувань.
 * Запускається лише якщо у середовищі налаштовано TELEGRAM_BOT_TOKEN (від @BotFather).
 */
export function startBotAndReminderServices(db) {
  let pollingActive = false;
  let lastUpdateId = 0;

  // 1. Live Telegram Bot (Webhook mode if TELEGRAM_WEBHOOK_SECRET is set, otherwise Long Polling)
  if (isTelegramConfigured()) {
    const token = process.env.TELEGRAM_BOT_TOKEN.trim();
    const baseUrl = `https://api.telegram.org/bot${token}`;
    const webAppUrl = getWebAppUrl();
    const useWebhookMode = Boolean(
      process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_WEBHOOK_SECRET.trim().length > 0
    );

    // Реєструємо меню команд та опис профілю бота у Telegram
    fetch(`${baseUrl}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: '👋 Запуск бота та закріплення посилання' },
          { command: 'deadlines', description: '⏰ Найближчі та прострочені дедлайни' },
          { command: 'today', description: '📅 Розклад занять на сьогодні' },
          { command: 'support', description: '💙 Підтримка та порада для фокусу' },
          { command: 'pin', description: '📌 Закріплене посилання на Cadence Planner' },
        ],
      }),
    }).catch(() => { });

    // Англійське меню команд — для користувачів з англійською мовою Telegram
    fetch(`${baseUrl}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_code: 'en',
        commands: [
          { command: 'start', description: '👋 Start the bot and pin the app link' },
          { command: 'deadlines', description: '⏰ Upcoming and overdue deadlines' },
          { command: 'today', description: "📅 Today's sessions" },
          { command: 'support', description: '💙 A gentle study boost' },
          { command: 'pin', description: '📌 Pinned Cadence Planner link' },
        ],
      }),
    }).catch(() => { });

    // Ім'я бота, яке бачать користувачі в Telegram (без підкреслень)
    fetch(`${baseUrl}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cadence Pulse' }),
    }).catch(() => { });

    fetch(`${baseUrl}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description:
          'Cadence Pulse — бот-помічник планувальника Cadence Planner. Нагадує про дедлайни, показує розклад на сьогодні, підтримує під час навчання та тримає швидке посилання на застосунок у закрепі.',
      }),
    }).catch(() => { });

    fetch(`${baseUrl}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        short_description: 'Бот-нагадувальник дедлайнів, розкладу та підтримки для Cadence Planner.',
      }),
    }).catch(() => { });

    if (!useWebhookMode) {
      let stopped = false;

      const scheduleNextPoll = (delayMs = 350) => {
        if (stopped) return;
        const timer = setTimeout(runPollLoop, delayMs);
        if (typeof timer.unref === 'function') timer.unref();
      };

      const pollOnce = async () => {
        if (pollingActive) return;
        pollingActive = true;
        try {
          const resp = await fetch(
            `${baseUrl}/getUpdates?offset=${lastUpdateId + 1}&timeout=15&allowed_updates=["message"]`
          );
          if (!resp.ok) return;
          const data = await resp.json();
          if (!data.ok || !Array.isArray(data.result)) return;

          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id || 0);
            const msg = update.message;
            if (!msg?.chat?.id || !msg?.text) continue;

            const chatId = String(msg.chat.id);
            const username = msg.from?.username ? `@${msg.from.username}` : '';
            // Мова відповіді — за мовою Telegram користувача: англійська для 'en', інакше українська
            const botLang = String(msg.from?.language_code || '').startsWith('en') ? 'en' : 'uk';
            const text = String(msg.text).trim();

            if (text.startsWith('/start ')) {
              const code = text.slice(7).trim().toUpperCase();
              const matched = db
                .prepare('SELECT user_id FROM notification_preferences WHERE telegram_link_code = ?')
                .get(code);

              if (matched) {
                db.prepare(
                  `UPDATE notification_preferences
                   SET telegram_chat_id = ?, telegram_username = COALESCE(NULLIF(?, ''), telegram_username), telegram_enabled = 1, updated_at = datetime('now')
                   WHERE user_id = ?`
                ).run(chatId, username, matched.user_id);

                const user = getUserById(db, matched.user_id);
                const { reply, pinnedText } = buildBotCommandReply(db, user, '/start', botLang);
                await sendTelegramBotMessage(chatId, reply);
                if (pinnedText) {
                  await sendTelegramBotMessage(chatId, pinnedText, { pin: true });
                }
                continue;
              }
            }

            let prefRow = db
              .prepare('SELECT user_id FROM notification_preferences WHERE telegram_chat_id = ?')
              .get(chatId);

            if (!prefRow && username) {
              prefRow = db
                .prepare(
                  'SELECT user_id FROM notification_preferences WHERE LOWER(telegram_username) = LOWER(?)'
                )
                .get(username);
              if (prefRow) {
                db.prepare(
                  `UPDATE notification_preferences SET telegram_chat_id = ?, telegram_enabled = 1, updated_at = datetime('now') WHERE user_id = ?`
                ).run(chatId, prefRow.user_id);
              }
            }

            if (!prefRow) {
              await sendTelegramBotMessage(
                chatId,
                botLang === 'en'
                  ? `👋 Hi! I'm Cadence Pulse 🤖 — the assistant of Cadence Planner.\n\n` +
                  `🔗 To link your account, open Profile in the web app and click "Message me on Telegram":\n${webAppUrl}`
                  : `👋 Привіт! Я Cadence Pulse 🤖 — помічник застосунку Cadence Planner.\n\n` +
                  `🔗 Щоб прив’язати акаунт, відкрий «Профіль» у вебзастосунку й натисни «Написати мені в Telegram»:\n${webAppUrl}`
              );
              continue;
            }

            const user = getUserById(db, prefRow.user_id);
            const { reply, pinnedText, shouldPin } = buildBotCommandReply(db, user, text, botLang);
            await sendTelegramBotMessage(chatId, reply);
            if (shouldPin && pinnedText) {
              await sendTelegramBotMessage(chatId, pinnedText, { pin: true });
            }
          }
        } catch {
          // Безшумно повторюємо на наступному циклі
        } finally {
          pollingActive = false;
        }
      };

      const runPollLoop = async () => {
        await pollOnce();
        scheduleNextPoll(350);
      };

      fetch(`${baseUrl}/deleteWebhook`, { method: 'POST' })
        .catch(() => { })
        .finally(() => {
          scheduleNextPoll(150);
        });
    }
  }

  // 2. Періодична перевірка дедлайнів для нагадувань у Telegram (кожні 15 хв)
  const sentTodayCache = new Set();
  const runReminderSweep = async () => {
    if (!isTelegramConfigured()) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const prefsRows = db.prepare('SELECT * FROM notification_preferences').all();

    for (const pref of prefsRows) {
      if (!pref.telegram_enabled || !pref.telegram_chat_id) continue;

      const hours = Number(pref.reminder_hours_before || 24);
      const nowIso = new Date().toISOString();
      const limitIso = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const tasks = db
        .prepare(
          `SELECT t.id, t.title, t.deadline, c.title AS course_title
           FROM tasks t
           JOIN courses c ON c.id = t.course_id
           WHERE t.user_id = ? AND t.status != 'done' AND t.deadline >= ? AND t.deadline <= ?
           ORDER BY t.deadline ASC`
        )
        .all(pref.user_id, nowIso, limitIso);

      if (tasks.length === 0) continue;

      const tgKey = `tg:${pref.user_id}:${todayKey}`;
      if (!sentTodayCache.has(tgKey)) {
        sentTodayCache.add(tgKey);
        const user = getUserById(db, pref.user_id);
        const { reply } = buildBotCommandReply(db, user, '/deadlines', 'uk');
        sendTelegramBotMessage(pref.telegram_chat_id, reply).catch(() => { });
      }
    }
  };

  const reminderTimer = setInterval(runReminderSweep, 15 * 60 * 1000);
  if (typeof reminderTimer.unref === 'function') reminderTimer.unref();
}
