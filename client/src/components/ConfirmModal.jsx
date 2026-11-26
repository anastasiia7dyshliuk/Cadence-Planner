import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import styles from './Modal.module.css';

export function Modal({ isOpen, onClose, title, compact = false, children }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`${styles.dialog} ${compact ? styles.dialogCompact : ''}`}>
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label={t.common.close}
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  loading = false,
}) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t.common.delete} compact>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p>
      <div className={styles.footer}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--danger)] text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          {loading ? t.common.deleting : confirmLabel || t.common.delete}
        </button>
      </div>
    </Modal>
  );
}
