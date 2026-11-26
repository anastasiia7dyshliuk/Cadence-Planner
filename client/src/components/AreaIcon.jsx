import {
  BookOpen,
  Briefcase,
  Code2,
  Compass,
  Dumbbell,
  GraduationCap,
  Languages,
  Laptop,
  Music,
  Palette,
} from 'lucide-react';

export const AREA_ICON_OPTIONS = [
  { id: 'GraduationCap', label: 'Навчання' },
  { id: 'Code2', label: 'Програмування' },
  { id: 'Languages', label: 'Мови' },
  { id: 'Briefcase', label: 'Робота' },
  { id: 'Dumbbell', label: 'Спорт' },
  { id: 'BookOpen', label: 'Читання' },
  { id: 'Laptop', label: 'Проєкти' },
  { id: 'Palette', label: 'Творчість' },
  { id: 'Music', label: 'Музика' },
  { id: 'Compass', label: 'Саморозвиток' },
];

export const AREA_COLOR_SWATCHES = [
  { hex: '#2563EB', name: 'Ультрамариновий', nameEn: 'Ultramarine' },
  { hex: '#7C3AED', name: 'Фіолетовий', nameEn: 'Violet' },
  { hex: '#0D9488', name: 'Бірюзовий', nameEn: 'Turquoise' },
  { hex: '#0EA5E9', name: 'Блакитний', nameEn: 'Sky Blue' },
  { hex: '#D946EF', name: 'Фуксі рожевий', nameEn: 'Fuchsia Pink' },
  { hex: '#8B5A2B', name: 'Коричневий', nameEn: 'Brown' },
  { hex: '#DC2626', name: 'Червоний', nameEn: 'Red' },
  { hex: '#475569', name: 'Сірий', nameEn: 'Slate Grey' },
];

export function getAreaColorName(hex, lang = 'uk') {
  if (!hex) return lang === 'en' ? 'Custom shade' : 'Власний відтінок';
  const normalized = String(hex).trim().toUpperCase();
  const match = AREA_COLOR_SWATCHES.find((item) => item.hex.toUpperCase() === normalized);
  if (match) {
    return lang === 'en' ? match.nameEn : match.name;
  }
  return lang === 'en' ? 'Custom shade' : 'Власний відтінок';
}

const ICON_MAP = {
  GraduationCap,
  Code2,
  Languages,
  Briefcase,
  Dumbbell,
  BookOpen,
  Laptop,
  Palette,
  Music,
  Compass,
};

export default function AreaIcon({ name = 'BookOpen', size = 18, color, className = '' }) {
  const IconComponent = ICON_MAP[name] || BookOpen;
  return <IconComponent size={size} style={color ? { color } : undefined} className={className} />;
}
