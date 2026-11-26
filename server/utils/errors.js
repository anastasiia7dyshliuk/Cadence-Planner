/**
 * Кастомний клас помилки застосунку з HTTP-статусом.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Безпечно перетворює параметр ідентифікатора на додатне ціле число.
 */
export function parseId(value, label = 'Ідентифікатор') {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${label} має бути коректним додатним числом.`, 400);
  }
  return num;
}
