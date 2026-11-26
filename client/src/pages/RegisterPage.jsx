import { Formik } from 'formik';
import { Eye, EyeOff, Globe, Moon, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { extractErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import CadenceLogoMark from '../components/CadenceLogoMark.jsx';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const { pushToast } = useNotifications();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [heroBroken, setHeroBroken] = useState(false);

  const registerSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string()
          .trim()
          .min(2, t.auth.validation.nameMin)
          .max(100, t.auth.validation.nameMax)
          .required(t.auth.validation.nameRequired),
        email: Yup.string()
          .trim()
          .email(t.auth.validation.emailInvalid)
          .required(t.auth.validation.emailRequired),
        password: Yup.string()
          .min(8, t.auth.validation.passwordMin)
          .required(t.auth.validation.passwordRequired),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref('password')], t.auth.validation.passwordsMismatch)
          .required(t.auth.validation.confirmRequired),
      }),
    [t]
  );

  return (
    <div className={styles.page}>
      <div className={styles.formPane}>
        <div className={styles.topBar}>
          <Link to="/login" className={styles.brand}>
            <CadenceLogoMark size={34} />
            <span className="truncate">{t.brandName}</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={lang === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
            >
              <Globe size={14} className="text-[var(--accent-violet)] shrink-0" />
              <span className="inline-flex items-center gap-1 font-mono-num leading-none whitespace-nowrap">
                <span className={lang === 'uk' ? 'text-[var(--text-primary)] font-bold' : 'opacity-50'}>
                  UA
                </span>
                <span className="opacity-35">/</span>
                <span className={lang === 'en' ? 'text-[var(--text-primary)] font-bold' : 'opacity-50'}>
                  EN
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 leading-none cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun size={14} className="text-amber-400 shrink-0" />
              ) : (
                <Moon size={14} className="text-[var(--accent-primary)] shrink-0" />
              )}
              <span>{theme === 'dark' ? t.common.lightTheme : t.common.darkTheme}</span>
            </button>
          </div>
        </div>

        <div className={styles.formCard}>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">{t.auth.registerTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            {t.auth.registerSubtitle}
          </p>

          {serverError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-sm text-[var(--danger)] font-medium"
            >
              {serverError}
            </div>
          )}

          <Formik
            initialValues={{ name: '', email: '', password: '', confirmPassword: '', rememberMe: true }}
            validationSchema={registerSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setServerError('');
              try {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('cadence_remember_pref', String(Boolean(values.rememberMe)));
                  if (values.rememberMe) {
                    localStorage.setItem(
                      'cadence_remembered_email',
                      values.email.trim().toLowerCase()
                    );
                  } else {
                    localStorage.removeItem('cadence_remembered_email');
                  }
                }
                await register({
                  name: values.name,
                  email: values.email,
                  password: values.password,
                  rememberMe: Boolean(values.rememberMe),
                });
                pushToast({
                  title: t.auth.regSuccessTitle,
                  message: t.auth.regSuccessMsg,
                  type: 'success',
                  playSound: false,
                });
                navigate('/', { replace: true });
              } catch (err) {
                setServerError(extractErrorMessage(err, t.auth.registerError));
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
              <form onSubmit={handleSubmit} autoComplete="on" noValidate className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-sm font-semibold mb-1.5">
                    {t.auth.nameLabel}
                  </label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t.auth.namePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.name && errors.name && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-semibold mb-1.5">
                    {t.auth.emailLabel}
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-semibold mb-1.5">
                    {t.auth.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder={t.auth.passwordPlaceholder}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-confirm" className="block text-sm font-semibold mb-1.5">
                    {t.auth.confirmPasswordLabel}
                  </label>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={Boolean(values.rememberMe)}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 accent-[var(--accent-primary)] rounded cursor-pointer shrink-0"
                  />
                  <span className="text-xs leading-snug">
                    <span className="block font-semibold text-[var(--text-primary)]">
                      {t.auth.rememberMe}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                      {t.auth.rememberMeHint}
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? t.auth.registering : t.auth.registerBtn}
                </button>
              </form>
            )}
          </Formik>

          <p className="mt-6 text-sm text-[var(--text-secondary)] text-center">
            {t.auth.hasAccount}{' '}
            <Link to="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
              {t.auth.goLogin}
            </Link>
          </p>
        </div>

        <div className="space-y-1 text-xs text-[var(--text-muted)]">
          <p className="font-medium text-[var(--text-secondary)]">
            {t.brandName} · {t.brandTagline}
          </p>
          <p>{t.developerFull}</p>
        </div>
      </div>

      <div className={styles.visualPane}>
        <div className={styles.visualInner}>
          {!heroBroken && (
            <img
              src="/src/assets/images/auth_hero_study_1795646968469.jpg"
              alt="Cadence Planner workspace"
              referrerPolicy="no-referrer"
              onError={() => setHeroBroken(true)}
              className={styles.heroImg}
            />
          )}
          <div className={styles.scrim}>
            <h2 className={styles.scrimTitle}>{t.auth.regHeroTitle}</h2>
            <p className={styles.scrimText}>{t.auth.regHeroText}</p>
            <div className="mt-4 pt-3 border-t border-white/20 text-xs text-white/85 leading-relaxed">
              <strong className="text-white">{t.nameOriginTitle}:</strong> {t.nameOriginText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
