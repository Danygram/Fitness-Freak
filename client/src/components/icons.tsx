import type { SVGProps } from 'react';

// A small, consistent line-icon set (24px grid, 1.75 stroke, round caps).
// Keeping them in-house avoids the generic emoji/clip-art look.
const PATHS: Record<string, JSX.Element> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="9.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.6" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.6" />
    </>
  ),
  nutrition: (
    <>
      <path d="M12 8.5C10.8 6 6 6 6 10.6 6 15 9 20 12 20s6-5 6-9.4C18 6 13.2 6 12 8.5Z" />
      <path d="M12 8.5c0-2 1.2-3.6 3.3-4.3" />
    </>
  ),
  weight: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3.2" />
      <path d="M8 15.5a4 4 0 0 1 8 0" />
      <path d="M12 15.5 14 13" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h3.5l2.2 6.5 4.3-13.5 2.3 7H21" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c3 4 5.2 6 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-1.6.6-2.7 1.7-3.8C9 11 10 8.5 12 3Z" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3.2s5.8 5.9 5.8 10a5.8 5.8 0 1 1-11.6 0c0-4.1 5.8-10 5.8-10Z" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2.5 4.5 13.5H11l-1 8L19.5 10H13l0-7.5Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M6.5 7l.9 12.2a1.3 1.3 0 0 0 1.3 1.2h6.6a1.3 1.3 0 0 0 1.3-1.2L18.5 7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5 10 17.5 20 7" />,
  power: (
    <>
      <path d="M12 3.5v8" />
      <path d="M7.5 6.8a7 7 0 1 0 9 0" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  trendUp: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M16.5 7H21v4.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.4" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  utensils: (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3M8 11v10" />
      <path d="M16 3c-1.6 0-2.4 2.2-2.4 4.4 0 2 .9 3.3 2.4 3.6V21" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4M5 4h11l-2 3.5L16 11H5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 20h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 14V4" />
      <path d="M8.5 7 12 3.5 15.5 7" />
      <path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  watch: (
    <>
      <rect x="6" y="7" width="12" height="10" rx="3" />
      <path d="M9 7l.5-3h5l.5 3M9 17l.5 3h5l.5-3" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="12.5" r="7.5" />
      <circle cx="12" cy="12.5" r="4.2" />
      <path d="M9.5 5l1-2.2h3l1 2.2" />
    </>
  ),
  band: (
    <>
      <rect x="5" y="9" width="14" height="6" rx="2.6" />
      <path d="M8 9V5.5M16 9V5.5M8 15v3.5M16 15v3.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6l2 2" />
      <path d="M20 4v4h-4" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.5 6l-2-2" />
      <path d="M4 20v-4h4" />
    </>
  ),
  bluetooth: <path d="M7 7.5 17 16l-5 4.5V3l5 4.5L7 16" />,
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" />
      <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20c0-4 3.4-6.3 7.5-6.3S19.5 16 19.5 20" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
