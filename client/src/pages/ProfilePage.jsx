import { Formik } from 'formik';
import {
  Bot,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Globe,
  LogOut,
  Moon,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Sun,
  Upload,
  UserCheck,
  UserPen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import CadenceBotAvatar from '../components/CadenceBotAvatar.jsx';
import UserAvatar, { PresetArtwork } from '../components/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { AVATAR_PRESETS, resizeImageToAvatarDataUrl } from '../utils/avatarPresets.js';
import { formatDateShort } from '../utils/dateHelpers.js';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const {
    soundSettings,
    soundPresets,
    updateSoundSettings,
    triggerChime,
    isPlayingSound,
    pushToast,
  } = useNotifications();

  const fileInputRef = useRef(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [sendingTgTest, setSendingTgTest] = useState(false);
  const [simulatingCmd, setSimulatingCmd] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [prefs, setPrefs] = useState({
    email_enabled: false,
    notification_email: user?.email || '',
    telegram_enabled: false,
    telegram_chat_id: '',
    telegram_username: '',
    telegram_link_code: '',
    reminder_hours_before: 24,
  });

  const [capabilities, setCapabilities] = useState({
    smtpConfigured: false,
    telegramConfigured: false,
    botName: 'Cadence Pulse',
    botUsername: 'cadence_pulse_bot',
    botDeepLink: 'https://t.me/cadence_pulse_bot',
    webAppUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    pinnedMessage: '',
  });

  const [previewOutput, setPreviewOutput] = useState(null);

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const res = await apiClient.get(`/integrations?lang=${lang}`);
      if (res.data?.preferences) setPrefs(res.data.preferences);
      if (res.data?.capabilities) setCapabilities(res.data.capabilities);
    } catch {
      // Безшумний фолбек, щоб сторінка профілю залишалась доступною
    } finally {
      setIntegrationsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // Коли користувач повертається з Telegram на вкладку сайту, тихо оновлюємо статус прив’язки,
  // щоб Chat ID і перемикач нагадувань з’явилися без перезавантаження сторінки.
  // Оновлюємо лише ці два поля, щоб не стерти те, що користувач уже ввів у формі.
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const res = await apiClient.get(`/integrations?lang=${lang}`);
        const fresh = res.data?.preferences;
        if (fresh) {
          setPrefs((prev) => ({
            ...prev,
            telegram_chat_id: fresh.telegram_chat_id,
            telegram_enabled: fresh.telegram_enabled,
          }));
        }
      } catch {
        // Якщо сервер недоступний — просто нічого не оновлюємо
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lang]);

  const handleSaveIntegrations = async () => {
    setSavingIntegrations(true);
    try {
      const res = await apiClient.put('/integrations', {
        email_enabled: false,
        telegram_enabled: prefs.telegram_enabled,
        telegram_username: prefs.telegram_username,
        telegram_chat_id: prefs.telegram_chat_id,
        reminder_hours_before: Number(prefs.reminder_hours_before),
      });
      if (res.data?.preferences) setPrefs(res.data.preferences);
      pushToast({
        title: t.profile.integrations.savedToastTitle,
        message: t.profile.integrations.savedToastMsg,
        type: 'success',
        playSound: false,
      });
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSavingIntegrations(false);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await apiClient.post('/integrations/telegram/regenerate-code');
      setPrefs((prev) => ({ ...prev, telegram_link_code: res.data.telegram_link_code }));
      if (res.data.botDeepLink) {
        setCapabilities((prev) => ({ ...prev, botDeepLink: res.data.botDeepLink }));
      }
    } catch (err) {
      pushToast({ title: 'Error', message: extractErrorMessage(err), type: 'error' });
    }
  };

  const handleCopyCommand = async () => {
    const cmd = `/start ${prefs.telegram_link_code}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ігноруємо обмеження буфера
    }
  };

  const handleSendTestTelegram = async () => {
    // Telegram не дозволяє ботам писати першими. Якщо чат ще не прив’язаний,
    // відкриваємо бота за посиланням із кодом: користувачу лишається натиснути «Почати»,
    // і бот сам прив’яже акаунт та надішле стартове привітання.
    if (!prefs.telegram_chat_id) {
      window.open(capabilities.botDeepLink, '_blank', 'noopener,noreferrer');
      pushToast({
        title: capabilities.botName,
        message: t.profile.integrations.telegramOpenStart,
        type: 'reminder',
        playSound: false,
      });
      return;
    }

    setSendingTgTest(true);
    try {
      const res = await apiClient.post('/integrations/test-telegram', {
        lang,
        telegram_username: prefs.telegram_username,
      });
      if (res.data.chatId) {
        setPrefs((prev) => ({
          ...prev,
          telegram_chat_id: res.data.chatId,
          telegram_enabled: true,
        }));
      }
      setPreviewOutput({
        kind: 'telegram',
        header: `${capabilities.botName} (@${capabilities.botUsername})${
          res.data.targetHandle ? ` → ${res.data.targetHandle}` : ''
        }`,
        body: res.data.message,
        pinned: res.data.pinnedMessage,
        mode: res.data.mode,
        delivered: res.data.delivered,
      });
      pushToast({
        title: capabilities.botName,
        message: res.data.delivered
          ? t.profile.integrations.telegramSentLive
          : res.data.mode === 'needs_start'
            ? t.profile.integrations.telegramSentNeedsStart
            : t.profile.integrations.telegramSentPreview,
        type: res.data.delivered ? 'success' : 'reminder',
        playSound: true,
      });
    } catch (err) {
      pushToast({ title: 'Error', message: extractErrorMessage(err), type: 'error' });
    } finally {
      setSendingTgTest(false);
    }
  };

  const handleSimulateBotCommand = async (cmd) => {
    setSimulatingCmd(cmd);
    try {
      const res = await apiClient.post('/integrations/telegram/simulate', { command: cmd, lang });
      setPreviewOutput({
        kind: 'telegram',
        header: `${res.data.botName} · ${cmd}`,
        body: res.data.reply,
        pinned: res.data.pinnedMessage,
        delivered: false,
      });
    } catch (err) {
      pushToast({ title: 'Error', message: extractErrorMessage(err), type: 'error' });
    } finally {
      setSimulatingCmd('');
    }
  };

  const profileSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string()
          .trim()
          .min(2, t.profile.validation.nameMin)
          .max(100, t.profile.validation.nameMax)
          .required(t.profile.validation.nameRequired),
        email: Yup.string()
          .trim()
          .email(t.profile.validation.emailInvalid)
          .required(t.profile.validation.emailRequired),
        bio: Yup.string().max(160, t.profile.validation.bioMax),
      }),
    [t]
  );

  const currentAvatar = user?.avatar_url || 'preset:student';

  const handleSelectAvatar = async (nextAvatarUrl) => {
    setSavingAvatar(true);
    try {
      await updateProfile({ avatar_url: nextAvatarUrl });
      pushToast({
        title: t.profile.profileSavedTitle,
        message: t.profile.avatarSavedMsg,
        type: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Error',
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await resizeImageToAvatarDataUrl(file);
      await handleSelectAvatar(dataUrl);
    } catch (err) {
      const msg =
        err?.message === 'INVALID_TYPE'
          ? t.profile.uploadErrorType
          : err?.message === 'FILE_TOO_LARGE'
            ? t.profile.uploadErrorSize
            : t.profile.uploadErrorRead;
      pushToast({
        title: 'Error',
        message: msg,
        type: 'error',
      });
    }
  };

  const handlePreviewSound = (presetId) => {
    triggerChime(presetId);
    pushToast({
      title: t.profile.previewToastTitle,
      message: t.profile.previewToastMsg,
      type: 'reminder',
      playSound: false,
      duration: 3500,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Картка користувача */}
      <section className={styles.studioCard}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar user={user} size={68} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingAvatar}
                title={t.profile.uploadPhotoBtn}
                aria-label={t.profile.uploadPhotoBtn}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white flex items-center justify-center border-2 border-[var(--bg-surface)] cursor-pointer transition-colors"
              >
                <Camera size={13} />
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] truncate">
                {user?.name}
              </h2>
              {user?.bio && (
                <p className="text-xs font-medium text-[var(--accent-primary)] mt-0.5 truncate">
                  {user.bio}
                </p>
              )}
              <p className="text-sm text-[var(--text-secondary)] truncate">{user?.email}</p>
              {user?.created_at && (
                <p className="text-xs text-[var(--text-muted)] mt-1 font-mono-num">
                  {t.profile.memberSince} {formatDateShort(user.created_at)}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut size={16} />
            <span>{t.common.logoutSystem}</span>
          </button>
        </div>
      </section>

      {/* Редагування особистого профілю та вибір/завантаження аватара */}
      <section className={styles.studioCard}>
        <h3 className="text-base font-bold mb-1 flex items-center gap-2">
          <UserPen size={17} className="text-[var(--accent-primary)]" />
          <span>{t.profile.editProfileTitle}</span>
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-5">{t.profile.editProfileSub}</p>

        {/* Вибір запропонованого аватара або завантаження власного фото */}
        <div className="mb-6 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-sm font-semibold">{t.profile.avatarSectionTitle}</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadPhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingAvatar}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)] hover:opacity-90 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <Upload size={13} />
                <span>{t.profile.uploadPhotoBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectAvatar('preset:initial')}
                disabled={savingAvatar}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                  currentAvatar === 'preset:initial'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span>{t.profile.useInitialBtn}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {AVATAR_PRESETS.map((preset) => {
              const selected =
                currentAvatar === preset.id ||
                (preset.id === 'preset:student' && (!user?.avatar_url || user.avatar_url === preset.image));
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={savingAvatar}
                  onClick={() => handleSelectAvatar(preset.id)}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-60 ${
                    selected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <PresetArtwork
                    presetId={preset.id}
                    initial={(user?.name || 'C').charAt(0).toUpperCase()}
                    size={42}
                  />
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate w-full text-center">
                    {t.profile.avatarPresets[preset.key]}
                  </span>
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
                      <Check size={10} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[var(--text-muted)] mt-2.5">{t.profile.uploadHint}</p>
        </div>

        {/* Форма зміни імені, email та статусу */}
        <Formik
          enableReinitialize
          initialValues={{
            name: user?.name || '',
            email: user?.email || '',
            bio: user?.bio || '',
          }}
          validationSchema={profileSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await updateProfile(values);
              pushToast({
                title: t.profile.profileSavedTitle,
                message: t.profile.profileSavedMsg,
                type: 'success',
              });
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-semibold mb-1.5">
                    {t.profile.nameLabel}
                  </label>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.name && errors.name && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-email" className="block text-xs font-semibold mb-1.5">
                    {t.profile.emailLabel}
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="profile-bio" className="block text-xs font-semibold mb-1.5">
                  {t.profile.bioLabel}
                </label>
                <input
                  id="profile-bio"
                  name="bio"
                  type="text"
                  value={values.bio}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t.profile.bioPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {touched.bio && errors.bio && (
                  <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.bio}</p>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span>{isSubmitting ? t.common.saving : t.profile.saveProfileBtn}</span>
                </button>
              </div>
            </form>
          )}
        </Formik>
      </section>

      {/* Мова інтерфейсу (UA / EN) */}
      <section className={styles.studioCard}>
        <h3 className="text-base font-bold mb-1 flex items-center gap-2">
          <Globe size={17} className="text-[var(--accent-violet)]" />
          <span>{t.profile.languageTitle}</span>
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">{t.profile.languageSub}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLang('uk')}
            className={`flex items-center justify-between gap-3 p-3.5 min-h-[72px] rounded-xl border text-left transition-colors cursor-pointer ${
              lang === 'uk'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold leading-snug">Українська</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                Повний україномовний інтерфейс
              </div>
            </div>
            <span className="text-xs font-mono-num font-bold text-[var(--accent-primary)] shrink-0">
              UA
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLang('en')}
            className={`flex items-center justify-between gap-3 p-3.5 min-h-[72px] rounded-xl border text-left transition-colors cursor-pointer ${
              lang === 'en'
                ? 'border-[var(--accent-violet)] bg-[rgba(124,58,237,0.1)]'
                : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold leading-snug">English</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                Complete English-language experience
              </div>
            </div>
            <span className="text-xs font-mono-num font-bold text-[var(--accent-violet)] shrink-0">
              EN
            </span>
          </button>
        </div>
      </section>

      {/* Вибір теми оформлення */}
      <section className={styles.studioCard}>
        <h3 className="text-base font-bold mb-1">{t.profile.themeTitle}</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">{t.profile.themeSub}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 p-3.5 min-h-[72px] rounded-xl border text-left transition-colors cursor-pointer ${
              theme === 'light'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Sun size={18} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-sm font-bold leading-snug">{t.common.lightThemeFull}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                {t.profile.lightDesc}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 p-3.5 min-h-[72px] rounded-xl border text-left transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Moon size={18} className="text-[var(--accent-primary)] shrink-0" />
            <div>
              <div className="text-sm font-bold leading-snug">{t.common.darkThemeFull}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                {t.profile.darkDesc}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Стилізовані налаштування звуку сповіщень і нагадувань */}
      <section className={styles.studioCard}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>{t.profile.soundTitle}</span>
              <span
                className={`${styles.visualizer} ${
                  isPlayingSound ? styles.visualizerActive : ''
                }`}
                aria-hidden="true"
              >
                <span className={styles.vBar} />
                <span className={styles.vBar} />
                <span className={styles.vBar} />
                <span className={styles.vBar} />
                <span className={styles.vBar} />
              </span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.profile.soundSub}</p>
          </div>

          <button
            type="button"
            onClick={() => updateSoundSettings({ enabled: !soundSettings.enabled })}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
              soundSettings.enabled
                ? 'border-[var(--accent-turquoise)] bg-[rgba(13,148,136,0.12)] text-[var(--accent-turquoise)]'
                : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {soundSettings.enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundSettings.enabled ? t.profile.soundEnabled : t.profile.soundDisabled}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {soundPresets.map((preset) => {
            const active = soundSettings.presetId === preset.id;
            const presetLocale = t.profile.presets[preset.id];
            const presetAccent =
              preset.id === 'kalimba'
                ? 'var(--accent-brown)'
                : preset.id === 'chime'
                  ? 'var(--accent-sky)'
                  : 'var(--accent-fuchsia)';
            return (
              <div
                key={preset.id}
                className="relative overflow-hidden p-3.5 rounded-xl border transition-colors"
                style={{
                  borderColor: active ? presetAccent : 'var(--border-subtle)',
                  backgroundColor: active ? 'var(--bg-surface-subtle)' : 'var(--bg-canvas)',
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ backgroundColor: presetAccent }}
                />
                <button
                  type="button"
                  onClick={() => {
                    updateSoundSettings({ presetId: preset.id });
                    triggerChime(preset.id);
                  }}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {presetLocale?.label || preset.label}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {presetLocale?.description || preset.description}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewSound(preset.id)}
                  style={{ color: presetAccent }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer"
                >
                  <Play size={13} />
                  <span>{t.profile.previewSound}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <label htmlFor="sound-volume" className="text-xs font-semibold text-[var(--text-secondary)]">
              {t.profile.volume}
            </label>
            <input
              id="sound-volume"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={soundSettings.volume}
              onChange={(e) => updateSoundSettings({ volume: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="text-xs font-mono-num w-10 text-right">
              {Math.round(soundSettings.volume * 100)}%
            </span>
          </div>
        </div>
      </section>

      {/* Telegram-бот сповіщень (Cadence Pulse) */}
      <section className={styles.studioCard}>
        <div className="mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Bot size={18} className="text-[var(--accent-turquoise)]" />
            <span>{t.profile.integrations.sectionTitle}</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            {t.profile.integrations.sectionSub}
          </p>
        </div>

        {integrationsLoading ? (
          <div className="h-44 rounded-xl bg-[var(--bg-canvas)] animate-pulse" />
        ) : (
          <div className="space-y-4">
            {/* Блок Telegram-бота Cadence Pulse */}
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CadenceBotAvatar size={52} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[var(--text-primary)]">
                        {capabilities.botName}
                      </span>
                      {capabilities.telegramConfigured ? (
                        <a
                          href={capabilities.botDeepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono-num font-bold text-[var(--accent-turquoise)] hover:underline"
                        >
                          <span>@{capabilities.botUsername}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-xs font-mono-num font-bold text-[var(--accent-turquoise)]">
                          @{capabilities.botUsername}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t.profile.integrations.botSubtitle}
                    </p>
                  </div>
                </div>

                {capabilities.telegramConfigured && (
                  <a
                    href={capabilities.botDeepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--accent-turquoise)] hover:opacity-90 text-white text-xs font-bold whitespace-nowrap transition-opacity"
                  >
                    <Send size={13} />
                    <span>{t.profile.integrations.openTelegramBotBtn}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] space-y-1">
                <div className="font-bold text-[var(--text-primary)]">
                  {t.profile.integrations.telegramStepsTitle}
                </div>
                <p>{t.profile.integrations.telegramStep1}</p>
                <p>{t.profile.integrations.telegramStep2}</p>
                <p>{t.profile.integrations.telegramStep3}</p>
              </div>

              {/* Поля: @username + перемикач сповіщень + швидка команда + Chat ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tg-username"
                    className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]"
                  >
                    {t.profile.integrations.telegramUsernameLabel}
                  </label>
                  <input
                    id="tg-username"
                    type="text"
                    value={prefs.telegram_username}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, telegram_username: e.target.value }))
                    }
                    placeholder={t.profile.integrations.telegramUsernamePlaceholder}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono-num focus:outline-none focus:border-[var(--accent-turquoise)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tg-chat-id"
                    className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]"
                  >
                    {t.profile.integrations.telegramChatIdLabel}
                  </label>
                  <input
                    id="tg-chat-id"
                    type="text"
                    value={prefs.telegram_chat_id}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, telegram_chat_id: e.target.value }))
                    }
                    placeholder={t.profile.integrations.telegramChatIdPlaceholder}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono-num focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                    {t.profile.integrations.linkCodeLabel}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono-num font-bold truncate">
                      /start {prefs.telegram_link_code}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyCommand}
                      title={t.profile.integrations.copyCodeBtn}
                      className="h-9 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedCode ? <Check size={13} className="text-[var(--accent-turquoise)]" /> : <Copy size={13} />}
                      <span className="hidden sm:inline">
                        {copiedCode ? t.profile.integrations.copiedToast : t.profile.integrations.copyCodeBtn}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title={t.profile.integrations.regenCodeBtn}
                      className="h-9 w-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] inline-flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="notif-hours"
                    className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]"
                  >
                    {t.profile.integrations.reminderHoursLabel}
                  </label>
                  <select
                    id="notif-hours"
                    value={prefs.reminder_hours_before}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, reminder_hours_before: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    {[6, 12, 24, 48].map((hr) => (
                      <option key={hr} value={hr}>
                        {hr} {t.profile.integrations.hoursSuffix}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.telegram_enabled)}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, telegram_enabled: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[var(--accent-turquoise)] rounded cursor-pointer"
                  />
                  <span>{t.profile.integrations.telegramToggle}</span>
                </label>
              </div>

              {/* Інтерактивні команди запуску та перевірки бота */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {t.profile.integrations.interactiveTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { cmd: '/start', label: t.profile.integrations.cmdStart },
                    { cmd: '/deadlines', label: t.profile.integrations.cmdDeadlines },
                    { cmd: '/today', label: t.profile.integrations.cmdToday },
                    { cmd: '/support', label: t.profile.integrations.cmdSupport },
                    { cmd: '/pin', label: t.profile.integrations.cmdPin },
                  ].map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      disabled={simulatingCmd === item.cmd}
                      onClick={() => handleSimulateBotCommand(item.cmd)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer disabled:opacity-60"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSendTestTelegram}
                  disabled={sendingTgTest}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent-turquoise)] bg-[var(--accent-turquoise-soft)] hover:opacity-90 text-[var(--accent-turquoise)] text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  <Send size={14} />
                  <span>
                    {sendingTgTest
                      ? t.profile.integrations.sending
                      : `${t.profile.integrations.testTelegramBtn}${
                          prefs.telegram_username ? ` (${prefs.telegram_username})` : ''
                        }`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveIntegrations}
                  disabled={savingIntegrations}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {savingIntegrations
                      ? t.common.saving
                      : t.profile.integrations.saveIntegrationsBtn}
                  </span>
                </button>
              </div>
            </div>

            {previewOutput && (
              <div className="p-4 rounded-xl border border-[var(--accent-turquoise)]/40 bg-[var(--bg-canvas)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-turquoise)]">
                    {t.profile.integrations.previewLabel} · {previewOutput.header}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewOutput(null)}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {t.common.close}
                  </button>
                </div>
                {previewOutput.kind === 'telegram' &&
                  (previewOutput.delivered || previewOutput.mode === 'needs_start') && (
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {previewOutput.delivered
                        ? t.profile.integrations.previewLiveNote
                        : t.profile.integrations.telegramSentNeedsStart}
                    </p>
                  )}
                <pre className="text-xs text-[var(--text-primary)] whitespace-pre-wrap break-words font-sans leading-relaxed">
                  {previewOutput.body}
                </pre>
                {previewOutput.pinned && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] whitespace-pre-line break-words">
                    {previewOutput.pinned}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Про Cadence Planner та авторство */}
      <section className={styles.studioCard}>
        <h3 className="text-base font-bold mb-2 flex items-center gap-2">
          <Sparkles size={17} className="text-[var(--accent-fuchsia)]" />
          <span>{t.profile.aboutTitle}</span>
        </h3>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-1">
              {t.nameOriginTitle}
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t.nameOriginText}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(192,38,211,0.12)] text-[var(--accent-fuchsia)] flex items-center justify-center shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.developerLabel}
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {t.developerName}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--accent-turquoise)]">
              {t.brandName} · v1.0
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
