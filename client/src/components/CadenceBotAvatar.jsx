export default function CadenceBotAvatar({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cadence Pulse Telegram Bot Avatar"
      className="shrink-0 drop-shadow-sm"
    >
      <defs>
        <linearGradient id="cadenceBotBg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="52%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="cadenceBotVisor" x1="16" y1="26" x2="48" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>

      {/* Rounded backdrop */}
      <rect x="2" y="2" width="60" height="60" rx="20" fill="url(#cadenceBotBg)" />

      {/* Headphone arc */}
      <path
        d="M15 33C15 22.5 22.6 15 32 15C41.4 15 49 22.5 49 33"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.92"
      />
      <rect x="10.5" y="29" width="6.5" height="13" rx="3.25" fill="#D946EF" stroke="#FFFFFF" strokeWidth="1.5" />
      <rect x="47" y="29" width="6.5" height="13" rx="3.25" fill="#14B8A6" stroke="#FFFFFF" strokeWidth="1.5" />

      {/* Signal antenna */}
      <line x1="32" y1="15" x2="32" y2="9.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="8" r="3" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.4" />

      {/* Bot face */}
      <rect x="17" y="22" width="30" height="24" rx="11" fill="#FFFFFF" />

      {/* Visor */}
      <rect x="20.5" y="26.5" width="23" height="12.5" rx="6.25" fill="url(#cadenceBotVisor)" />

      {/* Friendly glowing eyes */}
      <circle cx="27.5" cy="32.5" r="2.3" fill="#38BDF8" />
      <circle cx="36.5" cy="32.5" r="2.3" fill="#2DD4BF" />

      {/* Calm rhythm wave smile */}
      <path
        d="M27.5 42C29.3 43.3 31 43.6 32 43.6C33 43.6 34.7 43.3 36.5 42"
        stroke="#2563EB"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
