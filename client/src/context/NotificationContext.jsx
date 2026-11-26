import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { formatRelativeDeadline } from '../utils/dateHelpers.js';
import { getDueWithin24Hours } from '../utils/progressHelpers.js';
import { playPleasantChime, SOUND_PRESETS } from '../utils/soundNotifier.js';
import { useLanguage } from './LanguageContext.jsx';

const NotificationContext = createContext(null);
const SOUND_PREF_KEY = 'orientyr_sound_settings';

export function NotificationProvider({ children }) {
  const { lang, t } = useLanguage();
  const [toasts, setToasts] = useState([]);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'unsupported';
  });

  const [soundSettings, setSoundSettings] = useState(() => {
    try {
      const raw = window.localStorage.getItem(SOUND_PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: parsed.enabled !== false,
          presetId: parsed.presetId || 'kalimba',
          volume: typeof parsed.volume === 'number' ? parsed.volume : 0.45,
        };
      }
    } catch {
      // Значення за замовчуванням
    }
    return { enabled: true, presetId: 'kalimba', volume: 0.45 };
  });

  const notifiedTaskIdsRef = useRef(new Set());
  const waveTimerRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(soundSettings));
    } catch {
      // Ігноруємо
    }
  }, [soundSettings]);

  const triggerChime = useCallback(
    (overridePresetId) => {
      if (!soundSettings.enabled && !overridePresetId) return;
      const played = playPleasantChime({
        presetId: overridePresetId || soundSettings.presetId,
        volume: soundSettings.volume,
      });
      if (played) {
        setIsPlayingSound(true);
        if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
        waveTimerRef.current = setTimeout(() => setIsPlayingSound(false), 1100);
      }
    },
    [soundSettings.enabled, soundSettings.presetId, soundSettings.volume]
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, message, type = 'info', playSound = false, duration = 6000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, message, type }]);

      if (playSound && soundSettings.enabled) {
        triggerChime();
      }

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast, soundSettings.enabled, triggerChime]
  );

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      pushToast({
        title: t.notifications.notifUnsupportedTitle,
        message: t.notifications.notifUnsupportedMsg,
        type: 'info',
      });
      return 'unsupported';
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        triggerChime();
        pushToast({
          title: t.notifications.notifGrantedTitle,
          message: t.notifications.notifGrantedMsg,
          type: 'success',
        });
      } else {
        pushToast({
          title: t.notifications.notifDeniedTitle,
          message: t.notifications.notifDeniedMsg,
          type: 'warning',
        });
      }
      return result;
    } catch {
      return 'denied';
    }
  }, [pushToast, t, triggerChime]);

  const checkUpcomingDeadlines = useCallback(
    (tasks = [], { forceNotify = false, silent = false } = {}) => {
      const dueSoon = getDueWithin24Hours(tasks, new Date());
      if (dueSoon.length === 0) return [];

      const unnotified = forceNotify
        ? dueSoon
        : dueSoon.filter((task) => !notifiedTaskIdsRef.current.has(task.id));

      if (unnotified.length === 0) return dueSoon;

      unnotified.forEach((task) => notifiedTaskIdsRef.current.add(task.id));

      const first = unnotified[0];
      const rel = formatRelativeDeadline(first.deadline, lang);
      const summaryBody =
        unnotified.length === 1
          ? `«${first.title}» (${first.course_title}) — ${rel}`
          : `«${first.title}» (${rel}) ${t.notifications.andMore} ${unnotified.length - 1} ${t.notifications.tasks24h}`;

      if (!silent && permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new window.Notification(t.notifications.browserTitle, {
            body: summaryBody,
          });
        } catch {
          // Фолбек на toast нижче
        }
      }

      pushToast({
        title: t.notifications.due24Title,
        message: summaryBody,
        type: 'reminder',
        playSound: !silent,
        duration: 8500,
      });

      return dueSoon;
    },
    [lang, permission, pushToast, t]
  );

  const updateSoundSettings = (patch) => {
    setSoundSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        permission,
        soundSettings,
        soundPresets: SOUND_PRESETS,
        isPlayingSound,
        pushToast,
        dismissToast,
        triggerChime,
        updateSoundSettings,
        requestBrowserPermission,
        checkUpcomingDeadlines,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications має використовуватися всередині NotificationProvider');
  }
  return ctx;
}
