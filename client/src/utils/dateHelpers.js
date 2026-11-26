import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';

function getLocale(lang = 'uk') {
  return lang === 'en' ? enUS : uk;
}

/**
 * Форматує дату й час відповідно до обраної мови.
 */
export function formatDateTimeUk(isoString, lang = 'uk') {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'd MMM, HH:mm', { locale: getLocale(lang) });
}

/**
 * Форматує лише дату (25.11.2026).
 */
export function formatDateShort(isoString) {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'dd.MM.yyyy');
}

/**
 * Форматує лише час (18:30).
 */
export function formatTimeOnly(isoString) {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'HH:mm');
}

/**
 * Повертає відносний час до дедлайну (uk / en).
 */
export function formatRelativeDeadline(isoString, lang = 'uk') {
  if (!isoString) return '';
  const date = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: getLocale(lang) });
}

/**
 * Конвертує ISO-рядок у формат для <input type="datetime-local">.
 */
export function toLocalDateTimeInput(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Конвертує дату у формат YYYY-MM-DD для <input type="date">.
 */
export function toLocalDateInput(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Повертає привітання відповідно до часу доби та мови.
 */
export function getGreetingUk(now = new Date(), lang = 'uk') {
  const hour = now.getHours();
  if (lang === 'en') {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    if (hour >= 18 && hour < 23) return 'Good evening';
    return 'Good night';
  }
  if (hour >= 5 && hour < 12) return 'Доброго ранку';
  if (hour >= 12 && hour < 18) return 'Доброго дня';
  if (hour >= 18 && hour < 23) return 'Доброго вечора';
  return 'Тихої ночі';
}

/**
 * Перевіряє, чи відбувається подія сьогодні (враховує щотижневе повторення).
 */
export function isEventScheduledToday(event, now = new Date()) {
  if (!event?.start_datetime) return false;
  const start = new Date(event.start_datetime);
  if (Number.isNaN(start.getTime())) return false;

  if (isToday(start)) return true;

  if (event.recurrence === 'weekly' && start.getTime() <= now.getTime()) {
    return start.getDay() === now.getDay();
  }
  return false;
}
