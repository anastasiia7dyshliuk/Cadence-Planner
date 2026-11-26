import { useState } from 'react';
import { AVATAR_PRESETS, DEFAULT_PHOTO_AVATAR } from '../utils/avatarPresets.js';

/**
 * Рендерить поточний аватар користувача: завантажене фото, один із запропонованих пресетів або ініціал.
 */
export function PresetArtwork({ presetId, initial = 'C', size = 40 }) {
  const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return (
      <div
        className="rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold select-none shrink-0"
        style={{ width: size, height: size, fontSize: Math.max(13, Math.round(size * 0.4)) }}
      >
        {initial}
      </div>
    );
  }

  if (preset.image) {
    return (
      <img
        src={preset.image}
        alt="Avatar preset"
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden relative"
      style={{ width: size, height: size, background: preset.bg }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        {preset.key === 'ultramarine' && (
          <>
            <circle cx="48" cy="16" r="14" fill="rgba(255,255,255,0.18)" />
            <circle cx="32" cy="25" r="10" fill="rgba(255,255,255,0.92)" />
            <path d="M14 54c2-11 10-16 18-16s16 5 18 16" fill="rgba(255,255,255,0.9)" />
          </>
        )}
        {preset.key === 'fuchsia' && (
          <>
            <path d="M8 44c12-10 24 8 48-6" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="32" cy="24" r="9.5" fill="rgba(255,255,255,0.94)" />
            <path d="M15 54c3-10 9-14.5 17-14.5S46 44 49 54" fill="rgba(255,255,255,0.88)" />
          </>
        )}
        {preset.key === 'turquoise' && (
          <>
            <circle cx="32" cy="32" r="22" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <circle cx="32" cy="25" r="9.5" fill="rgba(255,255,255,0.94)" />
            <path d="M15 53c3-9.5 9-14 17-14s14 4.5 17 14" fill="rgba(255,255,255,0.9)" />
          </>
        )}
        {preset.key === 'amber' && (
          <>
            <circle cx="18" cy="18" r="12" fill="rgba(255,255,255,0.16)" />
            <circle cx="32" cy="25" r="9.5" fill="rgba(255,255,255,0.95)" />
            <path d="M15 54c3-10 9-14.5 17-14.5S46 44 49 54" fill="rgba(255,255,255,0.9)" />
          </>
        )}
        {preset.key === 'indigo' && (
          <>
            <circle cx="46" cy="18" r="4" fill="rgba(255,255,255,0.75)" />
            <circle cx="19" cy="16" r="2" fill="rgba(255,255,255,0.55)" />
            <circle cx="32" cy="26" r="9.5" fill="rgba(255,255,255,0.93)" />
            <path d="M15 54c3-10 9-14.5 17-14.5S46 44 49 54" fill="rgba(255,255,255,0.88)" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function UserAvatar({ user, avatarOverride, size = 40, className = '' }) {
  const [imgBroken, setImgBroken] = useState(false);
  const avatarValue = avatarOverride !== undefined ? avatarOverride : user?.avatar_url;
  const initial = (user?.name || 'C').trim().charAt(0).toUpperCase() || 'C';

  // Якщо користувач обрав ініціал
  if (avatarValue === 'preset:initial') {
    return (
      <div
        className={`rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-extrabold select-none shrink-0 border border-[var(--border-subtle)] ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(13, Math.round(size * 0.4)) }}
      >
        {initial}
      </div>
    );
  }

  // Якщо обрано один із SVG-пресетів
  if (avatarValue && avatarValue.startsWith('preset:') && avatarValue !== 'preset:student') {
    return (
      <div
        className={`rounded-full border border-[var(--border-subtle)] shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <PresetArtwork presetId={avatarValue} initial={initial} size={size} />
      </div>
    );
  }

  // Завантажене фото або стандартний студентський аватар
  const imgSrc =
    avatarValue && avatarValue.startsWith('data:image/')
      ? avatarValue
      : DEFAULT_PHOTO_AVATAR;

  if (imgBroken) {
    return (
      <div
        className={`rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-extrabold select-none shrink-0 border border-[var(--border-subtle)] ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(13, Math.round(size * 0.4)) }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={user?.name || 'User avatar'}
      referrerPolicy="no-referrer"
      onError={() => setImgBroken(true)}
      className={`rounded-full object-cover border border-[var(--border-subtle)] shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
