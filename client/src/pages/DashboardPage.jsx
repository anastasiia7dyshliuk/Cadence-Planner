import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  formatDateTimeUk,
  formatRelativeDeadline,
  formatTimeOnly,
  getGreetingUk,
  isEventScheduledToday,
} from '../utils/dateHelpers.js';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const {
    checkUpcomingDeadlines,
    triggerChime,
    pushToast,
  } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [bannerBroken, setBannerBroken] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, upcomingRes, allTasksRes, eventsRes] = await Promise.all([
        apiClient.get('/stats'),
        apiClient.get('/tasks/upcoming?days=3'),
        apiClient.get('/tasks'),
        apiClient.get('/events'),
      ]);

      setStats(statsRes.data);
      setUpcomingTasks(upcomingRes.data);

      const allTasks = allTasksRes.data || [];
      setOverdueTasks(allTasks.filter((task) => task.isOverdue));

      const now = new Date();
      setTodayEvents((eventsRes.data || []).filter((ev) => isEventScheduledToday(ev, now)));

      checkUpcomingDeadlines(allTasks, { silent: true });
    } catch (err) {
      setError(extractErrorMessage(err, t.dashboard.loadError));
    } finally {
      setLoading(false);
    }
  }, [checkUpcomingDeadlines, t.dashboard.loadError]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await apiClient.get('/tasks');
        checkUpcomingDeadlines(res.data || [], { silent: false });
      } catch {
        // Ігноруємо фонові помилки опитування
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [checkUpcomingDeadlines]);

  const handleMarkDone = async (task) => {
    try {
      await apiClient.put(`/tasks/${task.id}`, { status: 'done' });
      triggerChime();
      pushToast({
        title: t.dashboard.taskDoneToastTitle,
        message: `«${task.title}» ${t.dashboard.taskDoneToastMsg}`,
        type: 'success',
      });
      loadDashboard();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    }
  };

  const handleTestReminder = () => {
    const found = checkUpcomingDeadlines(upcomingTasks, { forceNotify: true });
    if (found.length === 0) {
      triggerChime();
      pushToast({
        title: t.dashboard.testReminderTitle,
        message: t.dashboard.testReminderMsg,
        type: 'reminder',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]">
        <p className="font-semibold mb-2">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 rounded-lg bg-[var(--danger)] text-white text-sm font-semibold cursor-pointer"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  const counters = stats?.counters || { total: 0, done: 0, in_progress: 0, overdue: 0 };
  const overallProgress = stats?.overallProgress ?? 0;
  const streak = stats?.streak ?? 0;

  return (
    <div className="space-y-6">
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--accent-fuchsia)] mb-1.5">
              <Sparkles size={13} />
              <span>{t.dashboard.kicker}</span>
            </p>
            <h2 className="text-2xl sm:text-[1.65rem] font-extrabold tracking-tight text-[var(--text-primary)] mb-3">
              {getGreetingUk(new Date(), lang)}, {user?.name?.split(' ')[0] || 'User'}!
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
              <div className="px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 flex flex-col justify-between gap-1">
                <div className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--text-muted)] leading-tight">
                  {t.dashboard.kpiTodayEvents}
                </div>
                <div className="text-base font-extrabold font-mono-num text-[var(--accent-fuchsia)]">
                  {todayEvents.length}
                </div>
              </div>
              <div className="px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 flex flex-col justify-between gap-1">
                <div className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--text-muted)] leading-tight">
                  {t.dashboard.kpiDeadlines}
                </div>
                <div className="text-base font-extrabold font-mono-num text-[var(--accent-sky)]">
                  {upcomingTasks.length}
                </div>
              </div>
              <div className="px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 flex flex-col justify-between gap-1">
                <div className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--text-muted)] leading-tight">
                  {t.dashboard.kpiOverall}
                </div>
                <div className="text-base font-extrabold font-mono-num text-[var(--accent-primary)]">
                  {overallProgress}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestReminder}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 size={15} className="text-[var(--accent-turquoise)]" />
              <span>{t.dashboard.testReminder}</span>
            </button>

            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--accent-violet)]/35 bg-[var(--accent-violet-soft)] hover:opacity-90 text-[var(--accent-violet)] text-xs font-bold transition-opacity whitespace-nowrap shrink-0"
            >
              {t.dashboard.allTasksLink}
            </Link>
          </div>
        </div>

        <div className={styles.heroMedia}>
          {!bannerBroken ? (
            <img
              src="/images/dashboard-focus.jpg"
              alt="Cadence Planner abstract balance artwork"
              referrerPolicy="no-referrer"
              onError={() => setBannerBroken(true)}
              className={styles.heroImg}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2563EB]/25 via-[#7C3AED]/20 to-[#0D9488]/25" />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(217, 70, 239, 0.1) 50%, rgba(13, 148, 136, 0.16) 100%)',
            }}
          />
        </div>
      </section>

      <section className={styles.kpiGrid} aria-label="Progress metrics">
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiAccentBar}
            style={{ backgroundColor: 'var(--accent-primary)' }}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            {t.dashboard.kpiOverall}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold font-mono-num text-[var(--accent-primary)]">
              {overallProgress}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {counters.done}/{counters.total} {t.dashboard.kpiTasksSuffix}
            </span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${overallProgress}%`,
                background:
                  'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-violet) 55%, var(--accent-turquoise) 100%)',
              }}
            />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiAccentBar}
            style={{ backgroundColor: 'var(--accent-sky)' }}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            {t.dashboard.kpiDeadlines}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold font-mono-num text-[var(--accent-sky)]">
              {upcomingTasks.length}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {t.dashboard.kpiNeedAttention}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiAccentBar}
            style={{
              backgroundColor:
                overdueTasks.length > 0 ? 'var(--danger)' : 'var(--accent-turquoise)',
            }}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            {t.dashboard.kpiOverdue}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-2xl font-extrabold font-mono-num ${
                overdueTasks.length > 0 ? 'text-[var(--danger)]' : 'text-[var(--accent-turquoise)]'
              }`}
            >
              {overdueTasks.length}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {overdueTasks.length > 0 ? t.dashboard.kpiOverdueLate : t.dashboard.kpiOverdueOnTime}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiAccentBar}
            style={{ backgroundColor: 'var(--accent-fuchsia)' }}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            {t.dashboard.kpiTodayEvents}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold font-mono-num text-[var(--accent-fuchsia)]">
              {todayEvents.length}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {t.dashboard.kpiOnSchedule}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div
            className={styles.kpiAccentBar}
            style={{ backgroundColor: 'var(--accent-violet)' }}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            {t.dashboard.kpiStreak}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold font-mono-num text-[var(--accent-violet)]">
              🔥 {streak}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {t.dashboard.kpiStreakHint}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.sectionsGrid}>
        <div className={styles.panel}>
          <div
            className={styles.panelTopBar}
            style={{ background: 'linear-gradient(90deg, var(--accent-sky), var(--accent-primary))' }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-bold flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-sky-soft)] text-[var(--accent-sky)]">
                <Clock size={16} />
              </span>
              <span>{t.dashboard.secUpcoming}</span>
            </h3>
            <span className="text-xs font-mono-num text-[var(--text-muted)]">
              {upcomingTasks.length}
            </span>
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
              {t.dashboard.secUpcomingEmpty}
            </p>
          ) : (
            <div>
              {upcomingTasks.slice(0, 6).map((task) => (
                <div key={task.id} className={styles.itemRow}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      <span style={{ color: task.area_color }} className="font-semibold">
                        {task.area_name}
                      </span>{' '}
                      · {task.course_title} · {t.dashboard.priorityLabel}:{' '}
                      {t.priorities[task.priority]}
                    </p>
                    <p className="text-xs font-mono-num text-[var(--accent-primary)] mt-1">
                      {formatDateTimeUk(task.deadline, lang)} (
                      {formatRelativeDeadline(task.deadline, lang)})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkDone(task)}
                    title={t.dashboard.markDoneTitle}
                    aria-label={`${t.dashboard.markDoneTitle}: ${task.title}`}
                    className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-turquoise)] hover:bg-[rgba(13,148,136,0.1)] text-[var(--text-secondary)] hover:text-[var(--accent-turquoise)] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Check size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div
            className={styles.panelTopBar}
            style={{ background: 'linear-gradient(90deg, var(--danger), var(--accent-fuchsia))' }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-bold flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--danger-soft)] text-[var(--danger)]">
                <AlertTriangle size={16} />
              </span>
              <span>{t.dashboard.secOverdue}</span>
            </h3>
            <span className="text-xs font-mono-num text-[var(--danger)] font-semibold">
              {overdueTasks.length}
            </span>
          </div>

          {overdueTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
              {t.dashboard.secOverdueEmpty}
            </p>
          ) : (
            <div>
              {overdueTasks.slice(0, 6).map((task) => (
                <div key={task.id} className={styles.itemRow}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--danger)] truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {task.area_name} · {task.course_title}
                    </p>
                    <p className="text-xs font-mono-num text-[var(--danger)] mt-1">
                      {t.dashboard.overdueTag} · {formatDateTimeUk(task.deadline, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkDone(task)}
                    title={t.dashboard.markDoneTitle}
                    aria-label={`${t.dashboard.markDoneTitle}: ${task.title}`}
                    className="w-8 h-8 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Check size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div
            className={styles.panelTopBar}
            style={{ background: 'linear-gradient(90deg, var(--accent-turquoise), var(--accent-violet))' }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-bold flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-turquoise-soft)] text-[var(--accent-turquoise)]">
                <CalendarClock size={16} />
              </span>
              <span>{t.dashboard.secTodayEvents}</span>
            </h3>
            <Link
              to="/calendar"
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              {t.dashboard.calendarLink}
            </Link>
          </div>

          {todayEvents.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
              {t.dashboard.secTodayEventsEmpty}
            </p>
          ) : (
            <div>
              {todayEvents.map((ev) => (
                <div key={ev.id} className={styles.itemRow}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      <span
                        className="font-semibold"
                        style={{ color: ev.area_color || 'var(--accent-primary)' }}
                      >
                        {ev.area_name || t.dashboard.personalTag}
                      </span>
                      {ev.course_title ? ` · ${ev.course_title}` : ''}
                      {ev.recurrence === 'weekly' ? ` · ${t.dashboard.weeklyTag}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono-num font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0">
                    {formatTimeOnly(ev.start_datetime)}–{formatTimeOnly(ev.end_datetime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
