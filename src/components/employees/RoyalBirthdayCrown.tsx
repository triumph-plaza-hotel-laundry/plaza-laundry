import { useId } from 'react';

/**
 * Lightweight metallic royal crown for birthday portraits.
 * Decorative only — always render with aria-hidden on the wrapper.
 */
export function RoyalBirthdayCrown({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gold = `royal-crown-gold-${uid}`;
  const rim = `royal-crown-rim-${uid}`;
  const gemRed = `royal-crown-gem-red-${uid}`;
  const gemGreen = `royal-crown-gem-green-${uid}`;
  const gemBlue = `royal-crown-gem-blue-${uid}`;
  const shine = `royal-crown-shine-${uid}`;
  const glow = `royal-crown-soft-glow-${uid}`;

  return (
    <span className={className}>
      <svg
        aria-hidden="true"
        className="org-employee-card__royal-crown-svg"
        fill="none"
        viewBox="0 0 64 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id={gold}
            x1="8"
            x2="56"
            y1="6"
            y2="44"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f3e2b0" />
            <stop offset="28%" stopColor="#d6b76e" />
            <stop offset="55%" stopColor="#b8893a" />
            <stop offset="78%" stopColor="#f0d48a" />
            <stop offset="100%" stopColor="#9a7028" />
          </linearGradient>
          <linearGradient
            id={rim}
            x1="10"
            x2="54"
            y1="34"
            y2="44"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#efe0a8" />
            <stop offset="45%" stopColor="#c9a45c" />
            <stop offset="100%" stopColor="#8f6824" />
          </linearGradient>
          <radialGradient id={gemRed} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff8a8a" />
            <stop offset="45%" stopColor="#c62828" />
            <stop offset="100%" stopColor="#6a1010" />
          </radialGradient>
          <radialGradient id={gemGreen} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#9dffb8" />
            <stop offset="45%" stopColor="#1b8a4a" />
            <stop offset="100%" stopColor="#0c4a28" />
          </radialGradient>
          <radialGradient id={gemBlue} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#9ec8ff" />
            <stop offset="45%" stopColor="#1e5fbf" />
            <stop offset="100%" stopColor="#0b2f6a" />
          </radialGradient>
          <linearGradient id={shine} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff8e0" stopOpacity="0" />
            <stop offset="40%" stopColor="#fff4cc" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#fff4cc" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#fff8e0" stopOpacity="0" />
          </linearGradient>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse
          cx="32"
          cy="41"
          fill="rgb(212 175 95 / 42%)"
          rx="20"
          ry="4.2"
        />
        <ellipse
          cx="32"
          cy="40.2"
          fill="rgb(255 236 180 / 22%)"
          rx="12"
          ry="2.2"
        />

        <path
          d="M8 36.5 L12 16.5 L22 28.5 L32 10.5 L42 28.5 L52 16.5 L56 36.5 Z"
          fill={`url(#${gold})`}
          filter={`url(#${glow})`}
          stroke="#8f6824"
          strokeLinejoin="round"
          strokeWidth="1.1"
        />

        <path
          d="M12.5 34.5 L15.2 20.8 L22.5 29.2 L32 15.2 L41.5 29.2 L48.8 20.8 L51.5 34.5 Z"
          fill="none"
          opacity="0.35"
          stroke="#fff4cc"
          strokeWidth="0.7"
        />

        <circle
          cx="12"
          cy="15.2"
          fill={`url(#${gold})`}
          r="2.35"
          stroke="#8f6824"
          strokeWidth="0.5"
        />
        <circle
          cx="32"
          cy="9.2"
          fill={`url(#${gold})`}
          r="2.7"
          stroke="#8f6824"
          strokeWidth="0.5"
        />
        <circle
          cx="52"
          cy="15.2"
          fill={`url(#${gold})`}
          r="2.35"
          stroke="#8f6824"
          strokeWidth="0.5"
        />

        <path
          d="M32 3.2 V7.6 M30.2 5 H33.8"
          stroke="#efe0a8"
          strokeLinecap="round"
          strokeWidth="1.35"
        />
        <path
          d="M32 3.2 V7.6 M30.2 5 H33.8"
          opacity="0.55"
          stroke="#8f6824"
          strokeLinecap="round"
          strokeWidth="0.55"
        />

        <ellipse
          cx="22"
          cy="27.8"
          fill={`url(#${gemRed})`}
          rx="2.4"
          ry="2.15"
          stroke="#5a1010"
          strokeWidth="0.45"
        />
        <ellipse
          cx="32"
          cy="24.6"
          fill={`url(#${gemGreen})`}
          rx="2.55"
          ry="2.25"
          stroke="#0c3a22"
          strokeWidth="0.45"
        />
        <ellipse
          cx="42"
          cy="27.8"
          fill={`url(#${gemBlue})`}
          rx="2.4"
          ry="2.15"
          stroke="#0b2f5a"
          strokeWidth="0.45"
        />

        <ellipse
          cx="21.2"
          cy="27"
          fill="#fff"
          opacity="0.45"
          rx="0.7"
          ry="0.45"
        />
        <ellipse
          cx="31.2"
          cy="23.8"
          fill="#fff"
          opacity="0.45"
          rx="0.75"
          ry="0.5"
        />
        <ellipse
          cx="41.2"
          cy="27"
          fill="#fff"
          opacity="0.45"
          rx="0.7"
          ry="0.45"
        />

        <rect
          x="9"
          y="35.2"
          width="46"
          height="6.2"
          rx="1.4"
          fill={`url(#${rim})`}
          stroke="#7a5a1e"
          strokeWidth="0.7"
        />
        <rect
          x="10.5"
          y="36.1"
          width="43"
          height="1.1"
          fill="#fff4cc"
          opacity="0.4"
          rx="0.4"
        />

        <circle cx="18" cy="38.3" fill={`url(#${gemBlue})`} r="1.35" />
        <circle cx="32" cy="38.3" fill={`url(#${gemRed})`} r="1.45" />
        <circle cx="46" cy="38.3" fill={`url(#${gemGreen})`} r="1.35" />

        <rect
          className="org-employee-card__royal-crown-shimmer"
          fill={`url(#${shine})`}
          height="48"
          opacity="0"
          width="18"
          x="-10"
          y="0"
        />
      </svg>

      <span aria-hidden="true" className="org-employee-card__royal-sparkles">
        <i className="org-employee-card__royal-sparkle org-employee-card__royal-sparkle--1" />
        <i className="org-employee-card__royal-sparkle org-employee-card__royal-sparkle--2" />
        <i className="org-employee-card__royal-sparkle org-employee-card__royal-sparkle--3" />
      </span>
    </span>
  );
}
