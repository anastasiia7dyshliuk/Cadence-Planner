import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Секрет JWT з оточення або тимчасовий криптографічно стійкий ключ у пам'яті
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

export function getJwtSecret() {
  return process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0
    ? process.env.JWT_SECRET.trim()
    : FALLBACK_SECRET;
}

/**
 * Розбирає заголовок Cookie без зовнішніх залежностей.
 */
function parseCookies(cookieHeader = '') {
  const result = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return result;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

/**
 * Middleware перевірки JWT-токена для захищених маршрутів.
 */
export function authenticateToken(req, res, next) {
  let token = null;
  let viaCookie = false;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.auth_token) {
      token = cookies.auth_token;
      viaCookie = true;
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Необхідна авторизація. Увійдіть у свій акаунт.',
    });
  }

  // Захист від CSRF для cookie-запитів на зміну даних
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (viaCookie && isMutation) {
    const requestedWith = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    const host = req.headers['x-forwarded-host'] || req.headers.host;

    let originMatchesHost = false;
    if (origin && host) {
      try {
        originMatchesHost = new URL(origin).host === host;
      } catch {
        originMatchesHost = false;
      }
    }

    if (requestedWith !== 'XMLHttpRequest' && !originMatchesHost) {
      return res.status(403).json({
        message: 'Запит відхилено перевіркою безпеки походження.',
      });
    }
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch {
    return res.status(401).json({
      message: 'Сесія недійсна або її термін дії вичерпано. Увійдіть повторно.',
    });
  }
}
