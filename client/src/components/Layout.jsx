import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Globe,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import CadenceLogoMark from './CadenceLogoMark.jsx';
import styles from './Layout.module.css';
import UserAvatar from './UserAvatar.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const { soundSettings, updateSoundSettings, triggerChime } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: t.nav.dashboard,
      icon: LayoutDashboard,
      end: true,
      color: 'var(--accent-primary)',
      bg: 'var(--accent-soft)',
    },
    {
      to: '/areas',
      label: t.nav.areas,
      icon: Layers,
      color: 'var(--accent-violet)',
      bg: 'var(--accent-violet-soft)',
    },
    {
      to: '/courses',
      label: t.nav.courses,
      icon: BookOpen,
      color: 'var(--accent-turquoise)',
      bg: 'var(--accent-turquoise-soft)',
    },
    {
      to: '/tasks',
      label: t.nav.tasks,
      icon: CheckSquare,
      color: 'var(--accent-sky)',
      bg: 'var(--accent-sky-soft)',
    },
    {
      to: '/calendar',
      label: t.nav.calendar,
      icon: CalendarDays,
      color: 'var(--accent-fuchsia)',
      bg: 'var(--accent-fuchsia-soft)',
    },
    {
      to: '/statistics',
      label: t.nav.statistics,
      icon: BarChart3,
      color: 'var(--accent-brown)',
      bg: 'var(--accent-brown-soft)',
    },
    {
      to: '/guide',
      label: t.nav.guide,
      icon: HelpCircle,
      color: 'var(--accent-primary)',
      bg: 'var(--accent-soft)',
    },
    {
      to: '/profile',
      label: t.nav.profile,
      icon: User,
      color: 'var(--accent-turquoise)',
      bg: 'var(--accent-turquoise-soft)',
    },
  ];

  const currentTitle = t.pageTitles[location.pathname] || t.brandName;

  const handleToggleSound = () => {
    const nextEnabled = !soundSettings.enabled;
    updateSoundSettings({ enabled: nextEnabled });
    if (nextEnabled) {
      setTimeout(() => triggerChime(soundSettings.presetId), 30);
    }
  };

  return (
    <div className={styles.shell}>
      {mobileOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div>
          <div className={styles.brandRow}>
            <Link to="/" className={styles.brandLink} onClick={() => setMobileOpen(false)}>
              <CadenceLogoMark size={32} />
              <span className={styles.brandText}>{t.brandName}</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className={styles.menuBtn}
              aria-label={t.common.close}
            >
              <X size={18} />
            </button>
          </div>

          <nav className={styles.navList} aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <span
                    className={styles.navIconBox}
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    <Icon size={17} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <Link
            to="/profile"
            className={styles.userRow}
            onClick={() => setMobileOpen(false)}
          >
            <UserAvatar user={user} size={34} />
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userEmail}>{user?.bio || user?.email}</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>{t.common.logout}</span>
          </button>

          <p className="px-2 pt-1 text-[11px] leading-snug text-[var(--text-muted)]">
            {t.developerLabel}: {t.developerName}
          </p>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={styles.menuBtn}
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
            <h1 className={styles.pageTitle}>{currentTitle}</h1>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              onClick={toggleLang}
              className={styles.iconActionBtn}
              aria-label={lang === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
            >
              <Globe size={15} className="text-[var(--accent-violet)] shrink-0" />
              <span className="inline-flex items-center gap-1 font-mono-num text-xs leading-none whitespace-nowrap">
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
              onClick={handleToggleSound}
              className={styles.iconActionBtn}
              aria-label={soundSettings.enabled ? t.common.soundOn : t.common.soundOff}
            >
              {soundSettings.enabled ? (
                <Volume2 size={16} className="text-[var(--accent-turquoise)] shrink-0" />
              ) : (
                <VolumeX size={16} className="shrink-0" />
              )}
              <span className={styles.btnLabelMobileHide}>
                {soundSettings.enabled ? t.common.soundOn : t.common.soundOff}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={styles.iconActionBtn}
              aria-label={theme === 'dark' ? t.common.lightThemeFull : t.common.darkThemeFull}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400 shrink-0" />
              ) : (
                <Moon size={16} className="text-[var(--accent-primary)] shrink-0" />
              )}
              <span className={styles.btnLabelMobileHide}>
                {theme === 'dark' ? t.common.lightTheme : t.common.darkTheme}
              </span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
