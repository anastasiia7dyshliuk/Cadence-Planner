import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/authMiddleware.js';
import { AppError } from '../utils/errors.js';

const STARTER_AREAS = [
  { name: 'Коледж', color: '#2563EB', icon: 'GraduationCap' },
  { name: 'FullStack-курси', color: '#7C3AED', icon: 'Code2' },
  { name: 'Німецька мова', color: '#0D9488', icon: 'Languages' },
  { name: 'Робота', color: '#8B5A2B', icon: 'Briefcase' },
  { name: 'Спорт', color: '#D946EF', icon: 'Dumbbell' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_AVATAR_PRESETS = new Set([
  'preset:student',
  'preset:ultramarine',
  'preset:fuchsia',
  'preset:turquoise',
  'preset:amber',
  'preset:indigo',
  'preset:initial',
  '/src/assets/images/profile_avatar_student_1795646968931.jpg',
]);

const RASTER_DATA_URI_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR_DATA_LENGTH = 360000;

function validateAvatarUrl(rawAvatar) {
  if (rawAvatar === undefined || rawAvatar === null) return '';
  if (typeof rawAvatar !== 'string') {
    throw new AppError('Некоректне значення аватара.', 400);
  }
  const trimmed = rawAvatar.trim();
  if (trimmed === '') return '';
  if (ALLOWED_AVATAR_PRESETS.has(trimmed)) return trimmed;
  if (RASTER_DATA_URI_REGEX.test(trimmed) && trimmed.length <= MAX_AVATAR_DATA_LENGTH) {
    return trimmed;
  }
  throw new AppError(
    'Недопустимий формат аватара. Оберіть запропонований варіант або фото PNG/JPG/WebP до 250 КБ.',
    400
  );
}

/**
 * Генерує підписаний JWT-токен для користувача.
 */
export function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

/**
 * Реєструє нового користувача та створює стартові 5 сфер.
 */
export async function registerUser(db, { name, email, password }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new AppError("Ім'я має містити від 2 до 100 символів.", 400);
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new AppError('Введіть коректну електронну пошту.', 400);
  }
  if (rawPassword.length < 8) {
    throw new AppError('Пароль має містити щонайменше 8 символів.', 400);
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(cleanEmail);

  if (existing) {
    throw new AppError('Користувач із такою електронною поштою вже існує.', 400);
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const createTx = db.transaction(() => {
    const res = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(cleanName, cleanEmail, passwordHash);

    const userId = Number(res.lastInsertRowid);

    const insertArea = db.prepare(
      'INSERT INTO areas (user_id, name, color, icon) VALUES (?, ?, ?, ?)'
    );
    for (const area of STARTER_AREAS) {
      insertArea.run(userId, area.name, area.color, area.icon);
    }

    return db
      .prepare('SELECT id, name, email, bio, avatar_url, created_at FROM users WHERE id = ?')
      .get(userId);
  });

  const user = createTx();
  const token = signUserToken(user);

  return { user, token };
}

/**
 * Перевіряє облікові дані та виконує вхід користувача.
 */
export async function loginUser(db, { email, password }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (!EMAIL_REGEX.test(cleanEmail) || rawPassword.length === 0) {
    throw new AppError('Вкажіть електронну пошту та пароль.', 400);
  }

  const userRow = db
    .prepare(
      'SELECT id, name, email, bio, avatar_url, password_hash, created_at FROM users WHERE email = ?'
    )
    .get(cleanEmail);

  if (!userRow) {
    throw new AppError('Невірна електронна пошта або пароль.', 401);
  }

  const passwordValid = await bcrypt.compare(rawPassword, userRow.password_hash);
  if (!passwordValid) {
    throw new AppError('Невірна електронна пошта або пароль.', 401);
  }

  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    bio: userRow.bio || '',
    avatar_url: userRow.avatar_url || '',
    created_at: userRow.created_at,
  };

  const token = signUserToken(user);
  return { user, token };
}

/**
 * Повертає профіль поточного користувача без хешу пароля.
 */
export function getUserById(db, userId) {
  const user = db
    .prepare('SELECT id, name, email, bio, avatar_url, created_at FROM users WHERE id = ?')
    .get(userId);

  if (!user) {
    throw new AppError('Користувача не знайдено.', 404);
  }
  return {
    ...user,
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
  };
}

/**
 * Оновлює особисті дані користувача (ім'я, email, статус/біо, аватар).
 */
export function updateUserProfile(db, userId, { name, email, bio, avatar_url }) {
  const current = getUserById(db, userId);

  const nextName = name !== undefined ? (typeof name === 'string' ? name.trim() : '') : current.name;
  const nextEmail =
    email !== undefined
      ? typeof email === 'string'
        ? email.trim().toLowerCase()
        : ''
      : current.email;
  const nextBio = bio !== undefined ? (typeof bio === 'string' ? bio.trim() : '') : current.bio;
  const nextAvatar =
    avatar_url !== undefined ? validateAvatarUrl(avatar_url) : current.avatar_url;

  if (nextName.length < 2 || nextName.length > 100) {
    throw new AppError("Ім'я має містити від 2 до 100 символів.", 400);
  }
  if (!EMAIL_REGEX.test(nextEmail)) {
    throw new AppError('Введіть коректну електронну пошту.', 400);
  }
  if (nextBio.length > 160) {
    throw new AppError('Опис профілю не може перевищувати 160 символів.', 400);
  }

  const duplicateEmail = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(nextEmail, userId);
  if (duplicateEmail) {
    throw new AppError('Ця електронна пошта вже використовується іншим акаунтом.', 400);
  }

  db.prepare('UPDATE users SET name = ?, email = ?, bio = ?, avatar_url = ? WHERE id = ?').run(
    nextName,
    nextEmail,
    nextBio,
    nextAvatar,
    userId
  );

  const updatedUser = getUserById(db, userId);
  const token = signUserToken(updatedUser);
  return { user: updatedUser, token };
}
