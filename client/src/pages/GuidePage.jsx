import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckSquare,
  GraduationCap,
  HelpCircle,
  Layers,
  Plus,
  Repeat,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * Наочна покрокова інструкція користувача зі стилізованими мініатюрами ("скріншотами") інтерфейсу.
 * Спроєктована так, щоб бути максимально зрозумілою для будь-якого віку.
 */
export default function GuidePage() {
  const { lang, t } = useLanguage();
  const isEn = lang === 'en';
  const g = t.guide;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Вступний блок */}
      <section className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {g.heading}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{g.subtitle}</p>
        </div>

        <Link
          to="/calendar"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <CalendarDays size={16} />
          <span>{g.quickStartCalendarBtn}</span>
        </Link>
      </section>

      {/* 5 простих кроків зі скрінами інтерфейсу */}
      <div className="space-y-5">
        {/* Крок 1: Сфери */}
        <article className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-[var(--accent-violet)] tabular-nums">
              {g.steps.step1.kicker}
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              {g.steps.step1.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {g.steps.step1.desc}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {g.steps.step1.tip}
            </p>
            <Link
              to="/areas"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-xs sm:text-sm font-bold text-[var(--text-primary)] transition-colors"
            >
              <span>{g.steps.step1.cta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden"
              aria-label={g.steps.step1.screenTitle}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Layers size={14} className="text-[var(--accent-violet)]" />
                  <span>{g.steps.step1.screenTitle}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] font-bold">
                  <Plus size={12} />
                  <span>{t.areas.newBtn}</span>
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative overflow-hidden p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5">
                  <div className="h-[3px] absolute top-0 left-0 right-0 bg-[#2563EB]" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#2563EB]/15 text-[#2563EB] flex items-center justify-center shrink-0">
                      <GraduationCap size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {isEn ? 'Studies / School' : 'Навчання'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {t.areas.coursesCount}: 2 · {isEn ? 'Ultramarine' : 'Ультрамариновий'}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-[#2563EB]" />
                  </div>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5">
                  <div className="h-[3px] absolute top-0 left-0 right-0 bg-[#0D9488]" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center shrink-0">
                      <Layers size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {isEn ? 'Languages' : 'Іноземна мова'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {t.areas.coursesCount}: 1 · {isEn ? 'Turquoise' : 'Бірюзовий'}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-[#0D9488]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Крок 2: Курси */}
        <article className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-[var(--accent-turquoise)] tabular-nums">
              {g.steps.step2.kicker}
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              {g.steps.step2.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {g.steps.step2.desc}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {g.steps.step2.tip}
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-xs sm:text-sm font-bold text-[var(--text-primary)] transition-colors"
            >
              <span>{g.steps.step2.cta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden"
              aria-label={g.steps.step2.screenTitle}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {g.steps.step2.screenTitle}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] font-bold">
                  <Plus size={12} />
                  <span>{t.courses.newBtn}</span>
                </span>
              </div>

              <div className="p-4">
                <div className="relative overflow-hidden p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <div className="h-[3px] absolute top-0 left-0 right-0 bg-[#7C3AED]" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-[#7C3AED]">
                        {isEn ? 'Languages' : 'Іноземна мова'}
                      </div>
                      <div className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                        {isEn ? 'English B1 · Speaking & Grammar' : 'Англійська B1 · Граматика й розмова'}
                      </div>
                    </div>
                    <span className="text-sm font-mono-num font-bold text-[var(--accent-turquoise)]">
                      67%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-[#7C3AED]" />
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] tabular-nums">
                    {t.courses.doneOf} 2 {t.courses.of} 3 {t.courses.tasksWord}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Крок 3: Завдання та дедлайни */}
        <article className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-[var(--accent-sky)] tabular-nums">
              {g.steps.step3.kicker}
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              {g.steps.step3.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {g.steps.step3.desc}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {g.steps.step3.tip}
            </p>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-xs sm:text-sm font-bold text-[var(--text-primary)] transition-colors"
            >
              <span>{g.steps.step3.cta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden"
              aria-label={g.steps.step3.screenTitle}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <CheckSquare size={14} className="text-[var(--accent-sky)]" />
                  <span>{g.steps.step3.screenTitle}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] font-bold">
                  <Plus size={12} />
                  <span>{t.tasks.newBtn}</span>
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-turquoise)] text-white flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold line-through text-[var(--text-muted)] truncate">
                        {isEn ? 'Read chapter 3 & write notes' : 'Прочитати 3-й розділ і зробити конспект'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {t.statuses.done}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full border-2 border-[var(--accent-primary)] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                        {isEn ? 'Learn 20 new vocabulary words' : 'Вивчити 20 нових слів'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                        <span>{isEn ? 'Tomorrow, 18:00' : 'Завтра, 18:00'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-[var(--accent-primary)] font-semibold">
                          <Repeat size={11} />
                          <span>{t.tasks.recWeekly}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Крок 4: Календар занять і дедлайнів */}
        <article className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-[var(--accent-fuchsia)] tabular-nums">
              {g.steps.step4.kicker}
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              {g.steps.step4.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {g.steps.step4.desc}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {g.steps.step4.tip}
            </p>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs sm:text-sm font-bold transition-colors"
            >
              <span>{g.steps.step4.cta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden"
              aria-label={g.steps.step4.screenTitle}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <CalendarDays size={14} className="text-[var(--accent-fuchsia)]" />
                  <span>{g.steps.step4.screenTitle}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] font-bold">
                  <Plus size={12} />
                  <span>{t.calendar.addEventBtn}</span>
                </span>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      day: isEn ? 'Mon' : 'Пн',
                      item: isEn ? '10:00 Math Class' : '10:00 Урок / Пара',
                      sub: isEn ? 'weekly' : 'щотижня',
                      bg: '#2563EB',
                    },
                    {
                      day: isEn ? 'Tue' : 'Вт',
                      item: isEn ? '17:30 English Club' : '17:30 Англійська',
                      sub: isEn ? 'weekly' : 'щотижня',
                      bg: '#0D9488',
                    },
                    {
                      day: isEn ? 'Wed' : 'Ср',
                      item: isEn ? 'Deadline: Essay' : 'Дедлайн: Есе',
                      sub: '18:00',
                      bg: '#7C3AED',
                    },
                  ].map((col) => (
                    <div
                      key={col.day}
                      className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2 min-h-[86px]"
                    >
                      <div className="text-[11px] font-bold text-[var(--text-muted)]">
                        {col.day}
                      </div>
                      <div
                        className="p-2 rounded-lg text-white text-[11px] font-bold leading-snug"
                        style={{ backgroundColor: col.bg }}
                      >
                        <div>{col.item}</div>
                        <div className="opacity-85 text-[10px] font-medium mt-0.5">{col.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Крок 5: Telegram-бот */}
        <article className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-[var(--accent-turquoise)] tabular-nums">
              {g.steps.step5.kicker}
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              {g.steps.step5.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {g.steps.step5.desc}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {g.steps.step5.tip}
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--accent-turquoise)] bg-[var(--accent-turquoise-soft)] text-[var(--accent-turquoise)] text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Send size={14} />
              <span>{g.steps.step5.cta}</span>
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden"
              aria-label={g.steps.step5.screenTitle}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Bot size={15} className="text-[var(--accent-turquoise)]" />
                  <span>Cadence Pulse · @cadence_pulse_bot</span>
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-turquoise)]">
                  Telegram
                </span>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-md leading-relaxed text-[var(--text-primary)]">
                  {isEn
                    ? 'Hey! Tomorrow at 18:00 you have a deadline: "Learn 20 new vocabulary words". Click the pinned link to open your planner.'
                    : 'Привіт! Нагадую: завтра о 18:00 дедлайн «Вивчити 20 нових слів». Посилання на планувальник завжди у закрепі!'}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <span>/today</span>
                  <span aria-hidden="true">·</span>
                  <span>/deadlines</span>
                  <span aria-hidden="true">·</span>
                  <span>/support</span>
                  <span aria-hidden="true">·</span>
                  <span>/pin</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* Часті запитання */}
      <section className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <h3 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
          <HelpCircle size={18} className="text-[var(--accent-primary)]" />
          <span>{g.faqTitle}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {g.faqs.map((item) => (
            <div
              key={item.q}
              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5"
            >
              <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-start gap-2">
                <ShieldCheck size={15} className="text-[var(--accent-turquoise)] shrink-0 mt-0.5" />
                <span>{item.q}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
