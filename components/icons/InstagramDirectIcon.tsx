import type { SVGProps } from 'react';

/** Instagram Direct (paper plane) — same path as the official IG nav icon */
export function InstagramDirectIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <line
        x1="22"
        y1="3"
        x2="9.218"
        y2="10.083"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
