import { Formik } from 'formik';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import apiClient, { extractErrorMessage } from '../api/client.js';
import CadenceLogoMark from '../components/CadenceLogoMark.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import styles from './AuthPage.module.css';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]';
const buttonClass =
  'w-full py-2.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60';

/**
 * Сторінка відновлення пароля з двох кроків:
 * 1) користувач вводить пошту й отримує 6-значний код;
 * 2) вводить код і новий пароль.
 */
export default function ForgotPasswordPage() {
  const { lang, t } = useLanguage();
  const { pushToast } = useNotifications();
  const navigate = useNavigate();

  // step = 'email' (крок 1) або 'code' (крок 2)
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const emailSchema = useMemo(
    () =>
      Yup.object({
        email: Yup.string()
          .trim()
          .email(t.auth.validation.emailInvalid)
          .required(t.auth.validation.emailRequired),
      }),
    [t]
  );

  const resetSchema = useMemo(
    () =>
      Yup.object({
        code: Yup.string()
          .matches(/^\d{6}$/, t.auth.reset.codeInvalid)
          .required(t.auth.reset.codeRequired),
        newPassword: Yup.string()
          .min(8, t.auth.validation.passwordMin)
          .required(t.auth.validation.passwordRequired),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref('newPassword')], t.auth.validation.passwordsMismatch)
          .required(t.auth.validation.confirmRequired),
      }),
    [t]
  );

  // Крок 1: запит коду
  async function handleRequestCode(values, { setSubmitting }) {
    setServerError('');
    try {
      const cleanEmail = values.email.trim().toLowerCase();
      await apiClient.post('/auth/forgot-password', { email: cleanEmail, lang });
      setEmail(cleanEmail);
      setInfoMessage(t.auth.reset.codeSent);
      setStep('code');
    } catch (err) {
      setServerError(extractErrorMessage(err, t.auth.reset.requestError));
    } finally {
      setSubmitting(false);
    }
  }

  // Крок 2: перевірка коду та збереження нового пароля
  async function handleResetPassword(values, { setSubmitting }) {
    setServerError('');
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        code: values.code.trim(),
        newPassword: values.newPassword,
      });
      pushToast({
        title: t.auth.reset.successTitle,
        message: t.auth.reset.successMsg,
        type: 'success',
        playSound: false,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(extractErrorMessage(err, t.auth.reset.resetError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.formPane}>
        <div className={styles.topBar}>
          <Link to="/login" className={styles.brand}>
            <CadenceLogoMark size={34} />
            <span className="truncate">{t.brandName}</span>
          </Link>
        </div>

        <div className={styles.formCard}>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">{t.auth.reset.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            {step === 'email' ? t.auth.reset.subtitleEmail : t.auth.reset.subtitleCode}
          </p>

          {serverError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-sm text-[var(--danger)] font-medium"
            >
              {serverError}
            </div>
          )}

          {infoMessage && step === 'code' && !serverError && (
            <div className="mb-4 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-sm text-[var(--text-secondary)]">
              {infoMessage} <strong className="text-[var(--text-primary)]">{email}</strong>
            </div>
          )}

          {step === 'email' && (
            <Formik initialValues={{ email: '' }} validationSchema={emailSchema} onSubmit={handleRequestCode}>
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-semibold mb-1.5">
                      {t.auth.emailLabel}
                    </label>
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="name@example.com"
                      className={inputClass}
                    />
                    {touched.email && errors.email && (
                      <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.email}</p>
                    )}
                  </div>

                  <button type="submit" disabled={isSubmitting} className={buttonClass}>
                    {isSubmitting ? t.auth.reset.sending : t.auth.reset.sendCodeBtn}
                  </button>
                </form>
              )}
            </Formik>
          )}

          {step === 'code' && (
            <Formik
              initialValues={{ code: '', newPassword: '', confirmPassword: '' }}
              validationSchema={resetSchema}
              onSubmit={handleResetPassword}
            >
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="reset-code" className="block text-sm font-semibold mb-1.5">
                      {t.auth.reset.codeLabel}
                    </label>
                    <input
                      id="reset-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={values.code}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="123456"
                      className={`${inputClass} font-mono-num tracking-[0.3em]`}
                    />
                    {touched.code && errors.code && (
                      <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.code}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reset-new-password" className="block text-sm font-semibold mb-1.5">
                      {t.auth.reset.newPasswordLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="reset-new-password"
                        name="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={values.newPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={t.auth.passwordPlaceholder}
                        className={`${inputClass} pr-10`}
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
                    {touched.newPassword && errors.newPassword && (
                      <p className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reset-confirm" className="block text-sm font-semibold mb-1.5">
                      {t.auth.confirmPasswordLabel}
                    </label>
                    <input
                      id="reset-confirm"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder={t.auth.confirmPasswordPlaceholder}
                      className={inputClass}
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="mt-1 text-xs font-medium text-[var(--danger)]">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <button type="submit" disabled={isSubmitting} className={buttonClass}>
                    {isSubmitting ? t.common.saving : t.auth.reset.saveBtn}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setServerError('');
                      setInfoMessage('');
                    }}
                    className="w-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {t.auth.reset.resendBtn}
                  </button>
                </form>
              )}
            </Formik>
          )}

          <p className="mt-6 text-sm text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent-primary)] hover:underline"
            >
              <ArrowLeft size={14} />
              {t.auth.reset.backToLogin}
            </Link>
          </p>
        </div>
      </div>

      <div className={styles.visualPane}>
        <div className={styles.visualInner}>
          <img src="/images/auth-hero.jpg" alt="Cadence Planner workspace" className={styles.heroImg} />
          <div className={styles.scrim}>
            <h2 className={styles.scrimTitle}>{t.auth.heroTitle}</h2>
            <p className={styles.scrimText}>{t.auth.heroText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
