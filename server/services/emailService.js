import nodemailer from 'nodemailer';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export function getWebAppUrl() {
  const raw = process.env.APP_URL;
  if (raw && raw !== 'MY_APP_URL' && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Чи налаштований хоча б один спосіб надсилання пошти.
 */
export function isEmailConfigured() {
  return isBrevoConfigured() || isSmtpConfigured();
}

/**
 * Надсилає лист через Brevo HTTP API.
 * Запит іде через HTTPS (порт 443), тому працює навіть на хостингах,
 * які блокують SMTP-порти (наприклад, безкоштовний тариф Render).
 */
async function sendViaBrevo({ to, subject, text, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'Cadence Planner',
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Brevo API повернув помилку ${response.status}: ${details}`);
  }
}

/**
 * Надсилає лист через SMTP (наприклад, Gmail) за допомогою nodemailer.
 * Зручно для локальної розробки.
 */
async function sendViaSmtp({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Єдина точка надсилання листів у застосунку.
 * Пріоритет: Brevo API → SMTP → лист не надсилається (delivered: false).
 */
export async function sendMail({ to, subject, text, html }) {
  if (isBrevoConfigured()) {
    await sendViaBrevo({ to, subject, text, html });
    return { delivered: true, mode: 'brevo' };
  }
  if (isSmtpConfigured()) {
    await sendViaSmtp({ to, subject, text, html });
    return { delivered: true, mode: 'smtp' };
  }
  return { delivered: false, mode: 'preview' };
}

/**
 * Формує лист-нагадування про найближчі дедлайни та надсилає через SMTP (якщо налаштовано)
 * або повертає точний попередній перегляд листа.
 */
export async function sendDeadlineReminderEmail({ to, userName, tasks = [], lang = 'uk' }) {
  const webAppUrl = getWebAppUrl();
  const isEn = lang === 'en';
  const subject = isEn
    ? 'Cadence Planner — Upcoming Deadlines & Rhythm Check-in'
    : 'Cadence Planner — Нагадування про дедлайни та ваш ритм';

  const taskLines =
    tasks.length > 0
      ? tasks.slice(0, 5).map((t) => {
        const dt = new Date(t.deadline).toLocaleString(isEn ? 'en-US' : 'uk-UA', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `• ${t.title} (${t.course_title || 'Course'}) — ${dt}`;
      })
      : [
        isEn
          ? '• No urgent deadlines right now — great time for steady progress!'
          : '• Критичних дедлайнів зараз немає — чудовий момент рухатися у своєму темпі!',
      ];

  const text = isEn
    ? `Hi, ${userName}!\n\nHere is your Cadence Planner reminder:\n${taskLines.join('\n')}\n\nOpen Cadence Planner: ${webAppUrl}`
    : `Вітаємо, ${userName}!\n\nНагадування від Cadence Planner:\n${taskLines.join('\n')}\n\nВідкрити застосунок: ${webAppUrl}`;

  const safeTaskItemsHtml =
    tasks.length > 0
      ? tasks
        .slice(0, 5)
        .map((t) => {
          const dt = new Date(t.deadline).toLocaleString(isEn ? 'en-US' : 'uk-UA', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return `<li style="margin-bottom:8px;"><strong>${escapeHtml(t.title)}</strong> <span style="color:#64748B;">(${escapeHtml(t.course_title || '')})</span> — <span style="color:#2563EB;">${escapeHtml(dt)}</span></li>`;
        })
        .join('')
      : `<li>${escapeHtml(
        isEn
          ? 'No urgent deadlines right now — keep your calm rhythm!'
          : 'Критичних дедлайнів зараз немає — тримайте спокійний ритм!'
      )}</li>`;

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #E1E7F0;border-radius:16px;background:#FFFFFF;color:#0F172A;">
      <div style="font-size:18px;font-weight:800;color:#2563EB;margin-bottom:8px;">Cadence Planner</div>
      <p style="margin:0 0 14px;font-size:14px;color:#475569;">${escapeHtml(
    isEn ? `Hi ${userName}, here are your upcoming study reminders:` : `Вітаємо, ${userName}! Ось ваші найближчі дедлайни:`
  )}</p>
      <ul style="padding-left:18px;margin:0 0 18px;font-size:14px;">${safeTaskItemsHtml}</ul>
      <a href="${escapeHtml(webAppUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:13px;">
        ${escapeHtml(isEn ? 'Open Cadence Planner' : 'Відкрити Cadence Planner')}
      </a>
    </div>
  `;

  const result = await sendMail({ to, subject, text, html });
  return { ...result, preview: { to, subject, text, webAppUrl } };
}

/**
 * Надсилає лист із кодом відновлення пароля.
 * Якщо пошта не налаштована, лист не надсилається (delivered: false).
 */
export async function sendPasswordResetEmail({ to, userName, code, minutes, lang = 'uk' }) {
  const isEn = lang === 'en';
  const subject = isEn
    ? 'Cadence Planner — password reset code'
    : 'Cadence Planner — код для відновлення пароля';
  const text = isEn
    ? `Hello, ${userName}!\n\nYour password reset code: ${code}\nIt is valid for ${minutes} minutes.\n\nIf you did not request a reset, just ignore this email.`
    : `Вітаємо, ${userName}!\n\nВаш код для відновлення пароля: ${code}\nВін діє ${minutes} хв.\n\nЯкщо ви не запитували відновлення, просто проігноруйте цей лист.`;

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #E1E7F0;border-radius:16px;background:#FFFFFF;color:#0F172A;">
      <div style="font-size:18px;font-weight:800;color:#2563EB;margin-bottom:12px;">Cadence Planner</div>
      <p style="margin:0 0 12px;font-size:14px;">${escapeHtml(isEn ? `Hello, ${userName}!` : `Вітаємо, ${userName}!`)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#475569;">${escapeHtml(isEn ? 'Your password reset code:' : 'Ваш код для відновлення пароля:')}</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#0F172A;margin:0 0 12px;">${escapeHtml(code)}</div>
      <p style="margin:0 0 12px;font-size:13px;color:#64748B;">${escapeHtml(isEn ? `The code is valid for ${minutes} minutes.` : `Код діє ${minutes} хв.`)}</p>
      <p style="margin:0;font-size:12px;color:#94A3B8;">${escapeHtml(isEn ? 'If you did not request a reset, just ignore this email.' : 'Якщо ви не запитували відновлення, просто проігноруйте цей лист.')}</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
}
