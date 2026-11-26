import axios from 'axios';

let inMemoryToken = null;

/**
 * Зберігає JWT-токен виключно в оперативній пам'яті клієнта.
 */
export function setAuthToken(token) {
  inMemoryToken = token || null;
}

export function getAuthToken() {
  return inMemoryToken;
}

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

/**
 * Витягує зрозуміле повідомлення про помилку з відповіді Axios.
 */
export function extractErrorMessage(err, fallback = 'Сталася помилка під час запиту до сервера.') {
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  if (err?.message) {
    return err.message;
  }
  return fallback;
}

export default apiClient;
