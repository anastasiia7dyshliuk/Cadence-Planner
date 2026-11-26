export const DEFAULT_PHOTO_AVATAR = '/images/avatar-student.jpg';

export const AVATAR_PRESETS = [
  {
    id: 'preset:student',
    key: 'student',
    image: DEFAULT_PHOTO_AVATAR,
    bg: 'linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%)',
  },
  {
    id: 'preset:ultramarine',
    key: 'ultramarine',
    primary: '#2563EB',
    secondary: '#0EA5E9',
    bg: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #38BDF8 100%)',
  },
  {
    id: 'preset:fuchsia',
    key: 'fuchsia',
    primary: '#C026D3',
    secondary: '#7C3AED',
    bg: 'linear-gradient(135deg, #701A75 0%, #C026D3 55%, #A855F7 100%)',
  },
  {
    id: 'preset:turquoise',
    key: 'turquoise',
    primary: '#0D9488',
    secondary: '#38BDF8',
    bg: 'linear-gradient(135deg, #115E59 0%, #0D9488 55%, #2DD4BF 100%)',
  },
  {
    id: 'preset:amber',
    key: 'amber',
    primary: '#8B5A2B',
    secondary: '#F59E0B',
    bg: 'linear-gradient(135deg, #78350F 0%, #B45309 55%, #FBBF24 100%)',
  },
  {
    id: 'preset:indigo',
    key: 'indigo',
    primary: '#312E81',
    secondary: '#8B5CF6',
    bg: 'linear-gradient(135deg, #0F172A 0%, #3730A3 60%, #8B5CF6 100%)',
  },
];

/**
 * Читає зображення з пристрою користувача та стискає його у квадрат 240×240 (JPEG Data URL).
 */
export function resizeImageToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('NO_FILE'));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      reject(new Error('INVALID_TYPE'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('FILE_TOO_LARGE'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_ERROR'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('READ_ERROR'));
      img.onload = () => {
        const targetSize = 240;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('READ_ERROR'));
          return;
        }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
