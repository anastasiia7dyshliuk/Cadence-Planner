import { BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  showImage = true,
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {showImage && !imgError ? (
        <div className="w-48 h-36 rounded-xl overflow-hidden mb-5 border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
          <img
            src="/src/assets/images/empty_planner_art_1795646968972.jpg"
            alt="Чистий щоденник для нових навчальних цілей"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent-primary)]">
          <BookOpen size={24} />
        </div>
      )}

      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
