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

  if (!isSmtpConfigured()) {
    return {
      delivered: false,
      mode: 'preview',
      preview: { to, subject, text, webAppUrl },
    };
  }

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

  return {
    delivered: true,
    mode: 'smtp',
    preview: { to, subject, text, webAppUrl },
  };
}
