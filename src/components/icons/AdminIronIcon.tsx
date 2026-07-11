import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

export const AdminIronIcon = forwardRef<SVGSVGElement, LucideProps>(
  function AdminIronIcon(
    { color = 'currentColor', size = 24, strokeWidth = 1.75, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        aria-hidden="true"
        fill="none"
        height={size}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        viewBox="0 0 24 24"
        width={size}
        {...props}
      >
        <path d="M4 14h16l-1.5 4H5.5L4 14Z" />
        <path d="M6 14V9.5C6 7.57 7.57 6 9.5 6h5C16.43 6 18 7.57 18 9.5V14" />
        <path d="M9 6V4.75C9 4.06 9.56 3.5 10.25 3.5h3.5c.69 0 1.25.56 1.25 1.25V6" />
        <path d="M8.5 10h7" />
      </svg>
    );
  },
);
