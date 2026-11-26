import { Formik } from 'formik';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import AreaIcon, {
  AREA_COLOR_SWATCHES,
  AREA_ICON_OPTIONS,
  getAreaColorName,
} from '../components/AreaIcon.jsx';
import { ConfirmModal, Modal } from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

export default function AreasPage() {
  const { lang, t } = useLanguage();
  const { pushToast } = useNotifications();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const areaSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string()
          .trim()
          .min(2, t.areas.validation.nameMin)
          .max(100, t.areas.validation.nameMax)
          .required(t.areas.validation.nameRequired),
        color: Yup.string()
          .matches(/^#[0-9A-Fa-f]{6}$/, t.areas.validation.colorInvalid)
          .required(t.areas.validation.colorRequired),
        icon: Yup.string().required(t.areas.validation.iconRequired),
      }),
    [t]
  );

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/areas');
      setAreas(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err, t.areas.loadError));
    } finally {
      setLoading(false);
    }
  }, [t.areas.loadError]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const openCreate = () => {
    setEditingArea(null);
    setModalOpen(true);
  };

  const openEdit = (area) => {
    setEditingArea(area);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/areas/${deleteTarget.id}`);
      pushToast({
        title: t.areas.deletedToast,
        message: `«${deleteTarget.name}»`,
        type: 'info',
      });
      setDeleteTarget(null);
      fetchAreas();
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
          <h2 className="text-xl font-extrabold tracking-tight">{t.areas.heading}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.areas.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={17} />
          <span>{t.areas.newBtn}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
          {error}
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          title={t.areas.emptyTitle}
          description={t.areas.emptyDesc}
          actionLabel={t.areas.emptyAction}
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map((area) => (
            <article
              key={area.id}
              className="relative overflow-hidden p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-4"
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ backgroundColor: area.color }}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${area.color}1A`,
                      color: area.color,
                    }}
                  >
                    <AreaIcon name={area.icon} size={20} color={area.color} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                      {area.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums flex flex-wrap items-center gap-1.5">
                      <span>
                        {t.areas.coursesCount}: {area.courseCount || 0}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{t.areas.colorLabel}:</span>
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: area.color }}
                          aria-hidden="true"
                        />
                        <span>{getAreaColorName(area.color, lang)}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(area)}
                    aria-label={`${t.common.edit} ${area.name}`}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(area)}
                    aria-label={`${t.common.delete} ${area.name}`}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-secondary)] font-medium">
                    {t.areas.avgProgress}
                  </span>
                  <span className="font-mono-num font-bold text-[var(--text-primary)]">
                    {area.progress || 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${area.progress || 0}%`,
                      backgroundColor: area.color,
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingArea ? t.areas.modalEdit : t.areas.modalCreate}
      >
        <Formik
          enableReinitialize
          initialValues={{
            name: editingArea?.name || '',
            color: editingArea?.color || '#2563EB',
            icon: editingArea?.icon || 'GraduationCap',
          }}
          validationSchema={areaSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              if (editingArea) {
                await apiClient.put(`/areas/${editingArea.id}`, values);
                pushToast({
                  title: t.areas.updatedToast,
                  message: `«${values.name}»`,
                  type: 'success',
                });
              } else {
                await apiClient.post('/areas', values);
                pushToast({
                  title: t.areas.createdToast,
                  message: `«${values.name}»`,
                  type: 'success',
                });
              }
              setModalOpen(false);
              fetchAreas();
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
            setFieldValue,
            isSubmitting,
          }) => (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="area-name" className="block text-sm font-semibold mb-1.5">
                  {t.areas.nameLabel}
                </label>
                <input
                  id="area-name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t.areas.namePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.name}</p>
                )}
              </div>

              <div>
                <span className="block text-sm font-semibold mb-2">
                  {t.areas.colorPickerLabel}
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {AREA_COLOR_SWATCHES.map((swatch) => {
                    const active = values.color.toUpperCase() === swatch.hex.toUpperCase();
                    const swatchLabel = lang === 'en' ? swatch.nameEn : swatch.name;
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => setFieldValue('color', swatch.hex)}
                        title={swatchLabel}
                        aria-label={swatchLabel}
                        className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                          active ? 'scale-110 ring-2 ring-offset-2 ring-[var(--text-primary)]' : ''
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    );
                  })}
                  <input
                    type="color"
                    name="color"
                    value={values.color}
                    onChange={handleChange}
                    aria-label="Custom color"
                    className="w-9 h-8 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer"
                  />
                </div>
                {touched.color && errors.color && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.color}</p>
                )}
              </div>

              <div>
                <span className="block text-sm font-semibold mb-2">
                  {t.areas.iconPickerLabel}
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {AREA_ICON_OPTIONS.map((opt) => {
                    const selected = values.icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFieldValue('icon', opt.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                          selected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                            : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <AreaIcon name={opt.id} size={18} />
                        <span className="truncate w-full text-center text-[11px]">
                          {t.areas.icons[opt.id] || opt.label}
                        </span>
                      </button>
                    );
                  })}
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
        title={t.areas.deleteTitle}
        message={`«${deleteTarget?.name}» ${t.areas.deleteMsg}`}
      />
    </div>
  );
}
