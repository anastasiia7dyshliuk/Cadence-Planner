import {
  getUserById,
  loginUser,
  registerUser,
  signUserToken,
  updateUserProfile,
} from '../services/authService.js';
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js';

function setAuthCookie(res, token, rememberMe = true) {
  const maxAgePart = rememberMe ? ` Max-Age=${30 * 24 * 60 * 60};` : '';
  res.setHeader(
    'Set-Cookie',
    `auth_token=${encodeURIComponent(token)}; Path=/;${maxAgePart} HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned'
  );
}

/**
 * Контролер реєстрації нового користувача.
 */
export async function register(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { name, email, password, rememberMe = true } = req.body || {};
    const result = await registerUser(db, { name, email, password });
    setAuthCookie(res, result.token, Boolean(rememberMe));
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Контролер входу користувача в систему.
 */
export async function login(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { email, password, rememberMe = true } = req.body || {};
    const result = await loginUser(db, { email, password });
    setAuthCookie(res, result.token, Boolean(rememberMe));
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Контролер виходу з системи (очищує сесійний cookie).
 */
export function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Вихід виконано успішно.' });
}

/**
 * Повертає дані авторизованого користувача.
 */
export function me(req, res, next) {
  try {
    const db = req.app.locals.db;
    const user = getUserById(db, req.user.id);
    const token = signUserToken(user);
    return res.status(200).json({ user, token });
  } catch (err) {
    return next(err);
  }
}

/**
 * Оновлює дані профілю авторизованого користувача.
 */
export function updateProfile(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { name, email, bio, avatar_url } = req.body || {};
    const result = updateUserProfile(db, req.user.id, { name, email, bio, avatar_url });
    setAuthCookie(res, result.token);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Крок 1 відновлення пароля: надсилає код на пошту та/або в Telegram.
 */
export async function forgotPassword(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { email, lang } = req.body || {};
    const result = await requestPasswordReset(db, { email, lang });
    return res.status(200).json({
      message: 'Якщо акаунт із такою поштою існує, ми надіслали код для відновлення.',
      channels: result.channels,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Крок 2 відновлення пароля: перевіряє код і встановлює новий пароль.
 */
export async function confirmPasswordReset(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { email, code, newPassword } = req.body || {};
    await resetPassword(db, { email, code, newPassword });
    return res.status(200).json({ message: 'Пароль успішно змінено.' });
  } catch (err) {
    return next(err);
  }
}
