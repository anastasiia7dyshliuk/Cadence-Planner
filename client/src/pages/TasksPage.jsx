import { Formik } from 'formik';
import { AlertTriangle, Pencil, Plus, Repeat, RotateCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import { ConfirmModal, Modal } from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDateTimeUk, toLocalDateTimeInput } from '../utils/dateHelpers.js';
import styles from './TasksPage.module.css';

function buildTaskValidationSchema(isEditing, v) {
  return Yup.object({
    course_id: Yup.string().required(v.courseRequired),
    title: Yup.string()
      .trim()
      .min(2, v.titleMin)
      .max(100, v.titleMax)
      .required(v.titleRequired),
    description: Yup.string().max(600, v.descMax),
    deadline: Yup.string()
      .required(v.deadlineRequired)
      .test('not-in-past', v.deadlinePast, (value) => {
        if (isEditing || !value) return true;
        return new Date(value).getTime() >= Date.now() - 60 * 1000;
      }),
    priority: Yup.string().oneOf(['low', 'medium', 'high']).required(),
    status: Yup.string().oneOf(['todo', 'in_progress', 'done']).required(),
    recurrence: Yup.string().oneOf(['none', 'daily', 'weekly']).required(),
  });
}

export default function TasksPage() {
  const { lang, t } = useLanguage();
  const { pushToast, triggerChime, checkUpcomingDeadlines } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Фільтри та сортування
  const [search, setSearch] = useState('');
  const [areaId, setAreaId] = useState('all');
  const [courseId, setCourseId] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [sort, setSort] = useState('deadline');

  // Модальні вікна
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const taskValidationSchema = useMemo(
    () => buildTaskValidationSchema(Boolean(editingTask), t.tasks.validation),
    [editingTask, t.tasks.validation]
  );

  const loadMetadata = useCallback(async () => {
    try {
      const [areasRes, coursesRes] = await Promise.all([
        apiClient.get('/areas'),
        apiClient.get('/courses'),
      ]);
      setAreas(areasRes.data || []);
      setCourses(coursesRes.data || []);
    } catch {
      // Помилка відобразиться при завантаженні завдань
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { sort };
      if (search.trim()) params.search = search.trim();
      if (areaId !== 'all') params.areaId = areaId;
      if (courseId !== 'all') params.courseId = courseId;
      if (status !== 'all') params.status = status;
      if (priority !== 'all') params.priority = priority;

      const res = await apiClient.get('/tasks', { params });
      const data = res.data || [];
      setTasks(data);
      checkUpcomingDeadlines(data);
    } catch (err) {
      setError(extractErrorMessage(err, t.tasks.loadError));
    } finally {
      setLoading(false);
    }
  }, [areaId, checkUpcomingDeadlines, courseId, priority, search, sort, status, t.tasks.loadError]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  const handleQuickStatus = async (task, nextStatus) => {
    try {
      await apiClient.put(`/tasks/${task.id}`, { status: nextStatus });
      if (nextStatus === 'done') {
        triggerChime();
      }
      pushToast({
        title: t.tasks.statusUpdated,
        message: `«${task.title}» → ${t.statuses[nextStatus] || nextStatus}`,
        type: nextStatus === 'done' ? 'success' : 'info',
        playSound: false,
      });
      loadTasks();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    }
  };

  const handleRenewTask = async (task) => {
    try {
      await apiClient.post(`/tasks/${task.id}/renew`);
      pushToast({
        title: t.tasks.renewedToast,
        message: `«${task.title}»`,
        type: 'success',
        playSound: false,
      });
      loadTasks();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${deleteTarget.id}`);
      pushToast({
        title: t.tasks.deletedToast,
        message: `«${deleteTarget.title}»`,
        type: 'info',
      });
      setDeleteTarget(null);
      loadTasks();
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

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const defaultDeadline = toLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{t.tasks.heading}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.tasks.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={courses.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Plus size={17} />
          <span>{t.tasks.newBtn}</span>
        </button>
      </div>

      {/* Панель пошуку, фільтрів та сортування */}
      <div className={styles.filterBar}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.tasks.searchPlaceholder}
            aria-label={t.tasks.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          aria-label={t.tasks.allAreas}
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm"
        >
          <option value="all">{t.tasks.allAreas}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          aria-label={t.tasks.allCourses}
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm"
        >
          <option value="all">{t.tasks.allCourses}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t.tasks.allStatuses}
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm"
        >
          <option value="all">{t.tasks.allStatuses}</option>
          <option value="todo">{t.statuses.todo}</option>
          <option value="in_progress">{t.statuses.in_progress}</option>
          <option value="done">{t.statuses.done}</option>
        </select>

        <div className="flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label={t.tasks.allPriorities}
            className="w-1/2 px-2.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm"
          >
            <option value="all">{t.tasks.allPriorities}</option>
            <option value="high">{t.priorities.high}</option>
            <option value="medium">{t.priorities.medium}</option>
            <option value="low">{t.priorities.low}</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label={t.tasks.sortDeadline}
            className="w-1/2 px-2.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm"
          >
            <option value="deadline">{t.tasks.sortDeadline}</option>
            <option value="priority">{t.tasks.sortPriority}</option>
            <option value="created">{t.tasks.sortCreated}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse" />
      ) : error ? (
        <div className="p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title={t.tasks.emptyTitle}
          description={t.tasks.emptyDesc}
          actionLabel={courses.length > 0 ? t.tasks.emptyAction : undefined}
          onAction={courses.length > 0 ? openCreate : undefined}
        />
      ) : (
        <>
          {/* Десктопна таблиця */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.tasks.colTask}</th>
                  <th>{t.tasks.colAreaCourse}</th>
                  <th>{t.tasks.colDeadline}</th>
                  <th>{t.tasks.colPriority}</th>
                  <th>{t.tasks.colStatus}</th>
                  <th className="text-right">{t.tasks.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className={task.isOverdue ? styles.rowOverdue : ''}>
                    <td>
                      <div className="font-semibold text-[var(--text-primary)] flex flex-wrap items-center gap-2">
                        {task.isOverdue && (
                          <AlertTriangle
                            size={15}
                            className="text-[var(--danger)] shrink-0"
                            aria-label={t.tasks.overdueTag}
                          />
                        )}
                        <span className={task.status === 'done' ? 'line-through opacity-65' : ''}>
                          {task.title}
                        </span>
                        {task.recurrence && task.recurrence !== 'none' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] text-[11px] font-bold whitespace-nowrap">
                            <Repeat size={11} />
                            <span>
                              {task.recurrence === 'daily' ? t.tasks.recDaily : t.tasks.recWeekly}
                            </span>
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1 max-w-md">
                          {task.description}
                        </p>
                      )}
                    </td>

                    <td>
                      <div className="text-xs font-bold" style={{ color: task.area_color }}>
                        {task.area_name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {task.course_title}
                      </div>
                    </td>

                    <td className="font-mono-num text-xs whitespace-nowrap">
                      <span
                        className={
                          task.isOverdue ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-primary)]'
                        }
                      >
                        {formatDateTimeUk(task.deadline, lang)}
                      </span>
                      {task.isOverdue && (
                        <div className="text-[11px] font-sans font-semibold text-[var(--danger)]">
                          {t.tasks.overdueTag}
                        </div>
                      )}
                    </td>

                    <td className="text-xs font-semibold">
                      <span
                        className={
                          task.priority === 'high'
                            ? 'text-[var(--danger)]'
                            : task.priority === 'medium'
                              ? 'text-[var(--accent-violet)]'
                              : 'text-[var(--accent-turquoise)]'
                        }
                      >
                        {t.priorities[task.priority] || task.priority}
                      </span>
                    </td>

                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatus(task, e.target.value)}
                        aria-label={`${t.tasks.colStatus}: ${task.title}`}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                      >
                        <option value="todo">{t.statuses.todo}</option>
                        <option value="in_progress">{t.statuses.in_progress}</option>
                        <option value="done">{t.statuses.done}</option>
                      </select>
                    </td>

                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {task.recurrence && task.recurrence !== 'none' && (
                          <button
                            type="button"
                            onClick={() => handleRenewTask(task)}
                            title={t.tasks.renewBtn}
                            aria-label={`${t.tasks.renewBtn}: ${task.title}`}
                            className="p-2 rounded-lg text-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise-soft)] cursor-pointer"
                          >
                            <RotateCw size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          aria-label={`${t.common.edit} ${task.title}`}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(task)}
                          aria-label={`${t.common.delete} ${task.title}`}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобільні та планшетні картки */}
          <div className={styles.mobileCards}>
            {tasks.map((task) => (
              <article
                key={task.id}
                className={`p-4 rounded-2xl border ${
                  task.isOverdue
                    ? 'border-[var(--danger-border)] bg-[var(--danger-soft)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                } space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold" style={{ color: task.area_color }}>
                      {task.area_name} · {task.course_title}
                    </p>
                    <h3
                      className={`text-sm font-bold mt-0.5 flex flex-wrap items-center gap-1.5 ${
                        task.status === 'done' ? 'line-through opacity-65' : ''
                      }`}
                    >
                      <span>{task.title}</span>
                      {task.recurrence && task.recurrence !== 'none' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] text-[10.5px] font-bold">
                          <Repeat size={10} />
                          <span>
                            {task.recurrence === 'daily' ? t.tasks.recDaily : t.tasks.recWeekly}
                          </span>
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.recurrence && task.recurrence !== 'none' && (
                      <button
                        type="button"
                        onClick={() => handleRenewTask(task)}
                        title={t.tasks.renewBtn}
                        aria-label={`${t.tasks.renewBtn}: ${task.title}`}
                        className="p-2 rounded-lg text-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise-soft)] cursor-pointer"
                      >
                        <RotateCw size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      aria-label={`${t.common.edit} ${task.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(task)}
                      aria-label={`${t.common.delete} ${task.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-mono-num ${
                      task.isOverdue ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {task.isOverdue ? `${t.tasks.overdueTag} · ` : ''}
                    {formatDateTimeUk(task.deadline, lang)}
                  </span>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {t.priorities[task.priority] || task.priority}
                  </span>
                </div>

                <select
                  value={task.status}
                  onChange={(e) => handleQuickStatus(task, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)]"
                >
                  <option value="todo">{t.statuses.todo}</option>
                  <option value="in_progress">{t.statuses.in_progress}</option>
                  <option value="done">{t.statuses.done}</option>
                </select>
              </article>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? t.tasks.modalEdit : t.tasks.modalCreate}
      >
        <Formik
          enableReinitialize
          initialValues={{
            course_id: editingTask?.course_id
              ? String(editingTask.course_id)
              : String(courses[0]?.id || ''),
            title: editingTask?.title || '',
            description: editingTask?.description || '',
            deadline: editingTask?.deadline
              ? toLocalDateTimeInput(editingTask.deadline)
              : defaultDeadline,
            priority: editingTask?.priority || 'medium',
            status: editingTask?.status || 'todo',
            recurrence: editingTask?.recurrence || 'none',
          }}
          validationSchema={taskValidationSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const payload = {
                ...values,
                course_id: Number(values.course_id),
                deadline: new Date(values.deadline).toISOString(),
              };

              if (editingTask) {
                await apiClient.put(`/tasks/${editingTask.id}`, payload);
                pushToast({
                  title: t.tasks.updatedToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              } else {
                await apiClient.post('/tasks', payload);
                pushToast({
                  title: t.tasks.createdToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              }
              setModalOpen(false);
              loadTasks();
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
                <label htmlFor="task-course" className="block text-sm font-semibold mb-1.5">
                  {t.tasks.courseLabel}
                </label>
                <select
                  id="task-course"
                  name="course_id"
                  value={values.course_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.area_name})
                    </option>
                  ))}
                </select>
                {touched.course_id && errors.course_id && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                    {errors.course_id}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="task-title" className="block text-sm font-semibold mb-1.5">
                  {t.tasks.titleLabel}
                </label>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  value={values.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t.tasks.titlePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
                {touched.title && errors.title && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="task-desc" className="block text-sm font-semibold mb-1.5">
                  {t.tasks.descLabel}
                </label>
                <textarea
                  id="task-desc"
                  name="description"
                  rows={2}
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>

              <div>
                <label htmlFor="task-deadline" className="block text-sm font-semibold mb-1.5">
                  {t.tasks.deadlineLabel}
                </label>
                <input
                  id="task-deadline"
                  name="deadline"
                  type="datetime-local"
                  value={values.deadline}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
                {touched.deadline && errors.deadline && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                    {errors.deadline}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="task-priority" className="block text-sm font-semibold mb-1.5">
                    {t.tasks.priorityLabel}
                  </label>
                  <select
                    id="task-priority"
                    name="priority"
                    value={values.priority}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="low">{t.priorities.low}</option>
                    <option value="medium">{t.priorities.medium}</option>
                    <option value="high">{t.priorities.high}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="task-status" className="block text-sm font-semibold mb-1.5">
                    {t.tasks.statusLabel}
                  </label>
                  <select
                    id="task-status"
                    name="status"
                    value={values.status}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="todo">{t.statuses.todo}</option>
                    <option value="in_progress">{t.statuses.in_progress}</option>
                    <option value="done">{t.statuses.done}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="task-recurrence" className="block text-sm font-semibold mb-1.5">
                    {t.tasks.recurrenceLabel}
                  </label>
                  <select
                    id="task-recurrence"
                    name="recurrence"
                    value={values.recurrence}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="none">{t.tasks.recNone}</option>
                    <option value="daily">{t.tasks.recDaily}</option>
                    <option value="weekly">{t.tasks.recWeekly}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
            </form>
          )}
        </Formik>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={t.tasks.deleteTitle}
        message={`«${deleteTarget?.title}» ${t.tasks.deleteMsg}`}
      />
    </div>
  );
}
