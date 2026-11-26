export default function CadenceLogoMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="cadenceLogoGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="52%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#cadenceLogoGrad)" />
      {/* Balanced cadence rhythm bars + ascending pulse arc */}
      <rect x="8.5" y="17.5" width="3.2" height="9.5" rx="1.6" fill="#FFFFFF" opacity="0.88" />
      <rect x="13.8" y="12" width="3.2" height="15" rx="1.6" fill="#FFFFFF" />
      <rect x="19.1" y="9" width="3.2" height="18" rx="1.6" fill="#FFFFFF" />
      <rect x="24.4" y="14.5" width="3.2" height="12.5" rx="1.6" fill="#2DD4BF" />
    </svg>
  );
}
