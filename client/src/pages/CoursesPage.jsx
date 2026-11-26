import { Formik } from 'formik';
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import { ConfirmModal, Modal } from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDateShort, toLocalDateInput } from '../utils/dateHelpers.js';

export default function CoursesPage() {
  const { t } = useLanguage();
  const { pushToast } = useNotifications();
  const [courses, setCourses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [areaFilter, setAreaFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const courseSchema = useMemo(
    () =>
      Yup.object({
        area_id: Yup.string().required(t.courses.validation.areaRequired),
        title: Yup.string()
          .trim()
          .min(2, t.courses.validation.titleMin)
          .max(100, t.courses.validation.titleMax)
          .required(t.courses.validation.titleRequired),
        description: Yup.string().max(500, t.courses.validation.descMax),
        start_date: Yup.string().required(t.courses.validation.startRequired),
        end_date: Yup.string()
          .required(t.courses.validation.endRequired)
          .test('after-start', t.courses.validation.endBeforeStart, function (value) {
            const { start_date } = this.parent;
            if (!start_date || !value) return true;
            return new Date(value) >= new Date(start_date);
          }),
      }),
    [t]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [areasRes, coursesRes] = await Promise.all([
        apiClient.get('/areas'),
        apiClient.get('/courses', {
          params: areaFilter !== 'all' ? { areaId: areaFilter } : {},
        }),
      ]);
      setAreas(areasRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err, t.courses.loadError));
    } finally {
      setLoading(false);
    }
  }, [areaFilter, t.courses.loadError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingCourse(null);
    setModalOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/courses/${deleteTarget.id}`);
      pushToast({
        title: t.courses.deletedToast,
        message: `«${deleteTarget.title}»`,
        type: 'info',
      });
      setDeleteTarget(null);
      loadData();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{t.courses.heading}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.courses.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={areas.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Plus size={17} />
          <span>{t.courses.newBtn}</span>
        </button>
      </div>

      {/* Фільтр за сферами */}
      {areas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] w-fit max-w-full">
          <button
            type="button"
            onClick={() => setAreaFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              areaFilter === 'all'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t.courses.allAreas}
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => setAreaFilter(String(area.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                areaFilter === String(area.id)
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
          {error}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title={t.courses.emptyTitle}
          description={t.courses.emptyDesc}
          actionLabel={areas.length > 0 ? t.courses.emptyAction : undefined}
          onAction={areas.length > 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <article
              key={course.id}
              className="relative overflow-hidden p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-4"
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ backgroundColor: course.area_color || 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold mb-1 truncate"
                      style={{ color: course.area_color }}
                    >
                      {course.area_name}
                    </p>
                    <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                      {course.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                      aria-label={`${t.common.edit} ${course.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(course)}
                      aria-label={`${t.common.delete} ${course.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {course.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono-num">
                  <CalendarRange size={14} />
                  <span>
                    {formatDateShort(course.start_date)} — {formatDateShort(course.end_date)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)] tabular-nums">
                      {t.courses.doneOf} {course.doneTasks} {t.courses.of} {course.totalTasks}{' '}
                      {t.courses.tasksWord}
                    </span>
                    <span className="font-mono-num font-bold text-[var(--text-primary)]">
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${course.progress}%`,
                        backgroundColor: course.area_color || 'var(--accent-primary)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCourse ? t.courses.modalEdit : t.courses.modalCreate}
      >
        <Formik
          enableReinitialize
          initialValues={{
            area_id: editingCourse?.area_id ? String(editingCourse.area_id) : String(areas[0]?.id || ''),
            title: editingCourse?.title || '',
            description: editingCourse?.description || '',
            start_date: editingCourse?.start_date || toLocalDateInput(new Date()),
            end_date:
              editingCourse?.end_date ||
              toLocalDateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          }}
          validationSchema={courseSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const payload = {
                ...values,
                area_id: Number(values.area_id),
              };
              if (editingCourse) {
                await apiClient.put(`/courses/${editingCourse.id}`, payload);
                pushToast({
                  title: t.courses.updatedToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              } else {
                await apiClient.post('/courses', payload);
                pushToast({
                  title: t.courses.createdToast,
                  message: `«${values.title}»`,
                  type: 'success',
                });
              }
              setModalOpen(false);
              loadData();
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
                <label htmlFor="course-area" className="block text-sm font-semibold mb-1.5">
                  {t.courses.areaLabel}
                </label>
                <select
                  id="course-area"
                  name="area_id"
                  value={values.area_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {touched.area_id && errors.area_id && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.area_id}</p>
                )}
              </div>

              <div>
                <label htmlFor="course-title" className="block text-sm font-semibold mb-1.5">
                  {t.courses.titleLabel}
                </label>
                <input
                  id="course-title"
                  name="title"
                  type="text"
                  value={values.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t.courses.titlePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {touched.title && errors.title && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="course-desc" className="block text-sm font-semibold mb-1.5">
                  {t.courses.descLabel}
                </label>
                <textarea
                  id="course-desc"
                  name="description"
                  rows={2}
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="course-start" className="block text-sm font-semibold mb-1.5">
                    {t.courses.startDateLabel}
                  </label>
                  <input
                    id="course-start"
                    name="start_date"
                    type="date"
                    value={values.start_date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.start_date && errors.start_date && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.start_date}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="course-end" className="block text-sm font-semibold mb-1.5">
                    {t.courses.endDateLabel}
                  </label>
                  <input
                    id="course-end"
                    name="end_date"
                    type="date"
                    value={values.end_date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.end_date && errors.end_date && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.end_date}
                    </p>
                  )}
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
        title={t.courses.deleteTitle}
        message={`«${deleteTarget?.title}» ${t.courses.deleteMsg}`}
      />
    </div>
  );
}
