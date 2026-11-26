import { AlertCircle, BellRing, CheckCircle2, Info, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';
import styles from './ToastContainer.module.css';

export default function ToastContainer() {
  const { toasts, dismissToast, isPlayingSound } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} role="status" aria-live="polite">
      {toasts.map((toast) => {
        const isDanger = toast.type === 'error' || toast.type === 'danger';
        const isSuccess = toast.type === 'success';
        const isReminder = toast.type === 'reminder';

        const iconClass = [
          styles.iconWrap,
          isDanger ? styles.iconDanger : '',
          isSuccess ? styles.iconSuccess : '',
        ]
          .filter(Boolean)
          .join(' ');

        const toastClass = [
          styles.toast,
          isReminder ? styles.toastReminder : '',
          isDanger ? styles.toastDanger : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={toast.id} className={toastClass}>
            <div className={iconClass}>
              {isReminder ? (
                <BellRing size={17} />
              ) : isDanger ? (
                <AlertCircle size={17} />
              ) : isSuccess ? (
                <CheckCircle2 size={17} />
              ) : (
                <Info size={17} />
              )}
            </div>

            <div className={styles.content}>
              <div className={styles.titleRow}>
                <p className={styles.title}>
                  {toast.title}
                  {isReminder && isPlayingSound && (
                    <span className={styles.waveBars} aria-hidden="true">
                      <span className={styles.bar} />
                      <span className={styles.bar} />
                      <span className={styles.bar} />
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className={styles.closeBtn}
                  aria-label="Закрити сповіщення"
                >
                  <X size={15} />
                </button>
              </div>
              {toast.message && <p className={styles.message}>{toast.message}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
