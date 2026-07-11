import type { ReactNode } from 'react';
import type { CareSymbolGraphic } from '@/data/care-symbols';

type CareSymbolGraphicProps = {
  className?: string;
  graphic: CareSymbolGraphic;
};

const stroke = 'currentColor';
const sw = 2;

function WashTub({ children }: { children?: ReactNode }) {
  return (
    <g>
      <path
        d="M14 22h36l-4 26H18L14 22z"
        fill="none"
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth={sw}
      />
      <path
        d="M18 18c4-6 24-6 28 0"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />
      {children}
    </g>
  );
}

function IronBase({ children }: { children?: ReactNode }) {
  return (
    <g>
      <path
        d="M16 40h32l-6 10H22L16 40z"
        fill="none"
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth={sw}
      />
      <path
        d="M20 40V26c0-4 24-4 24 0v14"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />
      {children}
    </g>
  );
}

function Dots({ count, x, y }: { count: 1 | 2 | 3; x: number; y: number }) {
  const offsets = count === 1 ? [0] : count === 2 ? [-5, 5] : [-8, 0, 8];
  return (
    <g>
      {offsets.map((offset) => (
        <circle key={offset} cx={x + offset} cy={y} fill={stroke} r="2.25" />
      ))}
    </g>
  );
}

function Cross({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  return (
    <g stroke={stroke} strokeWidth={sw}>
      <path d={`M${x - size} ${y - size}L${x + size} ${y + size}`} />
      <path d={`M${x + size} ${y - size}L${x - size} ${y + size}`} />
    </g>
  );
}

function graphicContent(graphic: CareSymbolGraphic) {
  switch (graphic) {
    case 'machine-wash':
      return <WashTub />;
    case 'hand-wash':
      return (
        <WashTub>
          <path
            d="M30 30c-2 4-2 8 0 12 2-4 2-8 0-12z"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
          <path
            d="M30 24v4M26 28h8"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
        </WashTub>
      );
    case 'do-not-wash':
      return (
        <WashTub>
          <Cross x={32} y={34} />
        </WashTub>
      );
    case 'wash-cold':
      return (
        <WashTub>
          <Dots count={1} x={32} y={34} />
        </WashTub>
      );
    case 'wash-warm':
      return (
        <WashTub>
          <Dots count={2} x={32} y={34} />
        </WashTub>
      );
    case 'wash-hot':
      return (
        <WashTub>
          <Dots count={3} x={32} y={34} />
        </WashTub>
      );
    case 'gentle-cycle':
      return (
        <WashTub>
          <path d="M22 48h20" fill="none" stroke={stroke} strokeWidth={sw} />
        </WashTub>
      );
    case 'delicate-cycle':
      return (
        <WashTub>
          <path
            d="M28 32c0 3 2 6 4 8"
            fill="none"
            stroke={stroke}
            strokeWidth={1.75}
          />
        </WashTub>
      );
    case 'bleach-allowed':
      return (
        <path
          d="M32 14L48 46H16L32 14z"
          fill="none"
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={sw}
        />
      );
    case 'bleach-non-chlorine':
      return (
        <g>
          <path
            d="M32 14L48 46H16L32 14z"
            fill="none"
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth={sw}
          />
          <text
            fill={stroke}
            fontFamily="Inter, sans-serif"
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            x="32"
            y="40"
          >
            CL
          </text>
        </g>
      );
    case 'do-not-bleach':
      return (
        <g>
          <path
            d="M32 14L48 46H16L32 14z"
            fill="none"
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth={sw}
          />
          <Cross size={8} x={32} y={34} />
        </g>
      );
    case 'tumble-dry':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="10"
            stroke={stroke}
            strokeWidth={sw}
          />
        </g>
      );
    case 'tumble-low':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="10"
            stroke={stroke}
            strokeWidth={sw}
          />
          <Dots count={1} x={32} y={32} />
        </g>
      );
    case 'tumble-medium':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="10"
            stroke={stroke}
            strokeWidth={sw}
          />
          <Dots count={2} x={32} y={32} />
        </g>
      );
    case 'tumble-high':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="10"
            stroke={stroke}
            strokeWidth={sw}
          />
          <Dots count={3} x={32} y={32} />
        </g>
      );
    case 'hang-dry':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <path
            d="M22 28c8 10 20 10 28 0"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
        </g>
      );
    case 'flat-dry':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <path d="M22 36h28" fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'drip-dry':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <path
            d="M26 28v14M32 28v14M38 28v14"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
        </g>
      );
    case 'do-not-tumble':
      return (
        <g>
          <rect
            fill="none"
            height="32"
            stroke={stroke}
            strokeWidth={sw}
            width="32"
            x="16"
            y="16"
          />
          <Cross size={9} x={32} y={32} />
        </g>
      );
    case 'iron-low':
      return (
        <IronBase>
          <Dots count={1} x={32} y={22} />
        </IronBase>
      );
    case 'iron-medium':
      return (
        <IronBase>
          <Dots count={2} x={32} y={22} />
        </IronBase>
      );
    case 'iron-high':
      return (
        <IronBase>
          <Dots count={3} x={32} y={22} />
        </IronBase>
      );
    case 'steam-iron':
      return (
        <IronBase>
          <path
            d="M24 18c2-4 16-4 18 0M22 14c4-6 20-6 24 0"
            fill="none"
            stroke={stroke}
            strokeWidth={1.75}
          />
        </IronBase>
      );
    case 'do-not-iron':
      return (
        <IronBase>
          <Cross size={8} x={32} y={22} />
        </IronBase>
      );
    case 'dry-clean':
      return (
        <g>
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="18"
            stroke={stroke}
            strokeWidth={sw}
          />
          <text
            fill={stroke}
            fontFamily="Inter, sans-serif"
            fontSize="16"
            fontWeight="700"
            textAnchor="middle"
            x="32"
            y="38"
          >
            P
          </text>
        </g>
      );
    case 'dry-clean-professional':
      return (
        <g>
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="18"
            stroke={stroke}
            strokeWidth={sw}
          />
          <text
            fill={stroke}
            fontFamily="Inter, sans-serif"
            fontSize="14"
            fontWeight="700"
            textAnchor="middle"
            x="32"
            y="36"
          >
            P
          </text>
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="12"
            stroke={stroke}
            strokeWidth={1.25}
          />
        </g>
      );
    case 'petroleum-solvent':
      return (
        <g>
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="18"
            stroke={stroke}
            strokeWidth={sw}
          />
          <text
            fill={stroke}
            fontFamily="Inter, sans-serif"
            fontSize="16"
            fontWeight="700"
            textAnchor="middle"
            x="32"
            y="38"
          >
            F
          </text>
        </g>
      );
    case 'do-not-dry-clean':
      return (
        <g>
          <circle
            cx="32"
            cy="32"
            fill="none"
            r="18"
            stroke={stroke}
            strokeWidth={sw}
          />
          <Cross size={12} x={32} y={32} />
        </g>
      );
    default:
      return null;
  }
}

export function CareSymbolGraphicView({
  className = '',
  graphic,
}: CareSymbolGraphicProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {graphicContent(graphic)}
    </svg>
  );
}
