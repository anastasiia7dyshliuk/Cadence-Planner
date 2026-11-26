import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';
import { Formik } from 'formik';
import { CalendarDays, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import { ConfirmModal, Modal } from '../components/ConfirmModal.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDateTimeUk, toLocalDateTimeInput } from '../utils/dateHelpers.js';
import { expandRecurringEvents } from '../utils/progressHelpers.js';

const locales = { uk, en: enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function CalendarPage() {
  const { lang, t } = useLanguage();
  const { pushToast } = useNotifications();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [slotStart, setSlotStart] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const eventSchema = useMemo(
    () =>
      Yup.object({
        title: Yup.string()
          .trim()
          .min(2, t.calendar.validation.titleMin)
          .max(100, t.calendar.validation.titleMax)
          .required(t.calendar.validation.titleRequired),
        course_id: Yup.string().nullable(),
        start_datetime: Yup.string().required(t.calendar.validation.startRequired),
        end_datetime: Yup.string()
          .required(t.calendar.validation.endRequired)
          .test('end-after-start', t.calendar.validation.endAfterStart, function (value) {
            const { start_datetime } = this.parent;
            if (!start_datetime || !value) return true;
            return new Date(value).getTime() > new Date(start_datetime).getTime();
          }),
        recurrence: Yup.string().oneOf(['none', 'weekly']).required(),
      }),
    [t]
  );

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, tasksRes, coursesRes] = await Promise.all([
        apiClient.get('/events'),
        apiClient.get('/tasks'),
        apiClient.get('/courses'),
      ]);
      setEvents(eventsRes.data || []);
      setTasks(tasksRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      pushToast({
        title: t.calendar.loadError,
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast, t.calendar.loadError]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const calendarItems = useMemo(() => {
    const expandedEvents = expandRecurringEvents(events, 4, 16).map((ev) => ({
      id: ev.instanceId,
      rawEvent: ev,
      kind: 'event',
      title: ev.recurrence === 'weekly' ? `${ev.title} (${t.calendar.weeklySuffix})` : ev.title,
      start: ev.start,
      end: ev.end,
      color: ev.area_color || '#2563EB',
    }));

    const taskDeadlines = tasks.map((task) => {
      const deadlineDate = new Date(task.deadline);
      const start = new Date(deadlineDate.getTime() - 45 * 60 * 1000);
      return {
        id: `task-${task.id}`,
        rawTask: task,
        kind: 'task',
        title: `${t.calendar.deadlinePrefix}: ${task.title}`,
        start,
        end: deadlineDate,
        color: task.isOverdue ? '#DC2626' : task.area_color || '#0D9488',
      };
    });

    return [...expandedEvents, ...taskDeadlines];
  }, [events, tasks, t.calendar.deadlinePrefix, t.calendar.weeklySuffix]);

  const handleSelectSlot = ({ start }) => {
    setEditingEvent(null);
    setSlotStart(start);
    setEventModalOpen(true);
  };

  const handleSelectItem = (item) => {
    if (item.kind === 'task') {
      setSelectedTask(item.rawTask);
      return;
    }
    setEditingEvent(item.rawEvent);
    setSlotStart(null);
    setEventModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/events/${deleteTarget.id}`);
      pushToast({
        title: t.calendar.deletedToast,
        message: `«${deleteTarget.title}»`,
        type: 'info',
      });
      setDeleteTarget(null);
      setEventModalOpen(false);
      loadCalendarData();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const initialStart = editingEvent
    ? toLocalDateTimeInput(editingEvent.start_datetime)
    : slotStart
      ? toLocalDateTimeInput(
          new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate(), 10, 0)
        )
      : toLocalDateTimeInput(new Date());

  const initialEnd = editingEvent
    ? toLocalDateTimeInput(editingEvent.end_datetime)
    : slotStart
      ? toLocalDateTimeInput(
          new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate(), 11, 30)
        )
      : toLocalDateTimeInput(new Date(Date.now() + 90 * 60 * 1000));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{t.calendar.heading}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.calendar.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEvent(null);
            setSlotStart(new Date());
            setEventModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={17} />
          <span>{t.calendar.addEventBtn}</span>
        </button>
      </div>

      {!loading && events.length === 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {t.calendar.emptyLessonsTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {t.calendar.emptyLessonsDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/guide"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap"
            >
              <HelpCircle size={14} />
              <span>{t.calendar.emptyLessonsGuide}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setSlotStart(new Date());
                setEventModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <Plus size={14} />
              <span>{t.calendar.emptyLessonsBtn}</span>
            </button>
          </div>
        </div>
      )}

      <div className="p-3 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {loading ? (
          <div className="h-[470px] sm:h-[560px] lg:h-[640px] rounded-xl bg-[var(--bg-surface-subtle)] animate-pulse" />
        ) : (
          <div className="cadence-calendar-wrap">
            <Calendar
              localizer={localizer}
              culture={lang}
              events={calendarItems}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={currentDate}
              onNavigate={setCurrentDate}
              views={['month', 'week', 'day']}
              messages={t.calendar.messages}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectItem}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.color,
                  color: '#FFFFFF',
                },
              })}
            />
          </div>
        )}
      </div>

      {/* Модальне вікно створення / редагування заняття */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? t.calendar.modalEdit : t.calendar.modalCreate}
      >
        <Formik
          enableReinitialize
          initialValues={{
            title: editingEvent?.title || '',
            course_id: editingEvent?.course_id ? String(editingEvent.course_id) : '',
            start_datetime: initialStart,
            end_datetime: initialEnd,
            recurrence: editingEvent?.recurrence || 'none',
          }}
          validationSchema={eventSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const payload = {
                title: values.title,
                course_id: values.course_id ? Number(values.course_id) : null,
                start_datetime: new Date(values.start_datetime).toISOString(),
                end_datetime: new Date(values.end_datetime).toISOString(),
                recurrence: values.recurrence,
              };

              if (editingEvent) {
                await apiClient.put(`/events/${editingEvent.id}`, payload);
                pushToast({
                  title: t.calendar.updatedToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              } else {
                await apiClient.post('/events', payload);
                pushToast({
                  title: t.calendar.createdToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              }
              setEventModalOpen(false);
              loadCalendarData();
            } catch (err) {
              pushToast({
                title: 'Error',
                message: extractErrorMessage(err),
                type: 'error',
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="ev-title" className="block text-sm font-semibold mb-1.5">
                  {t.calendar.titleLabel}
                </label>
                <input
                  id="ev-title"
                  name="title"
                  type="text"
                  value={values.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t.calendar.titlePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
                {touched.title && errors.title && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="ev-course" className="block text-sm font-semibold mb-1.5">
                  {t.calendar.courseLabel}
                </label>
                <select
                  id="ev-course"
                  name="course_id"
                  value={values.course_id}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="">{t.calendar.noCourse}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.area_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ev-start" className="block text-sm font-semibold mb-1.5">
                    {t.calendar.startLabel}
                  </label>
                  <input
                    id="ev-start"
                    name="start_datetime"
                    type="datetime-local"
                    value={values.start_datetime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  />
                  {touched.start_datetime && errors.start_datetime && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.start_datetime}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ev-end" className="block text-sm font-semibold mb-1.5">
                    {t.calendar.endLabel}
                  </label>
                  <input
                    id="ev-end"
                    name="end_datetime"
                    type="datetime-local"
                    value={values.end_datetime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  />
                  {touched.end_datetime && errors.end_datetime && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.end_datetime}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="ev-recurrence" className="block text-sm font-semibold mb-1.5">
                  {t.calendar.recurrenceLabel}
                </label>
                <select
                  id="ev-recurrence"
                  name="recurrence"
                  value={values.recurrence}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="none">{t.calendar.recNone}</option>
                  <option value="weekly">{t.calendar.recWeekly}</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(editingEvent)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>{t.common.delete}</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEventModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm font-medium hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? t.common.saving : t.common.save}
                  </button>
                </div>
              </div>
            </form>
          )}
        </Formik>
      </Modal>

      {/* Перегляд деталей дедлайну завдання */}
      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={t.calendar.taskModalTitle}
        compact
      >
        {selectedTask && (
          <div className="space-y-3 text-sm">
            <p className="text-xs font-bold" style={{ color: selectedTask.area_color }}>
              {selectedTask.area_name} · {selectedTask.course_title}
            </p>
            <h3 className="text-base font-bold">{selectedTask.title}</h3>
            {selectedTask.description && (
              <p className="text-[var(--text-secondary)]">{selectedTask.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs font-mono-num text-[var(--text-secondary)]">
              <CalendarDays size={15} />
              <span>
                {t.calendar.deadlinePrefix}: {formatDateTimeUk(selectedTask.deadline, lang)}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm font-medium cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold cursor-pointer"
              >
                {t.calendar.goToTasks}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={t.calendar.deleteTitle}
        message={`«${deleteTarget?.title}» ${t.calendar.deleteMsg}`}
      />
    </div>
  );
}
