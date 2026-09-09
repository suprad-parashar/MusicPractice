import type { SVGProps } from 'react';

const paths = {
  music:
    'M9 18V5l12-2v13M9 9l12-2M9 18a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3ZM21 16a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3Z',
  ragas: 'M4 16v-4m4 7V5m4 17V2m4 17V5m4 11v-4',
  practice: 'M5 20V10m7 10V4m7 16v-7M3 10h4M10 4h4m3 9h4',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3M5 12H3v8h4v-8H5Zm14 0h2v8h-4v-8h2Z',
  rhythm: 'm8 3-4 18h16L16 3H8Zm4 14 7-12M7 17h10',
  book: 'M12 5v16M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z',
  library: 'M4 4v16M9 4v16M14 5l5-1 3 15-5 1-3-15Z',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  play: 'm8 5 11 7-11 7V5Z',
  stop: 'M6 6h12v12H6z',
  loop: 'm17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  check: 'm5 12 4 4L19 6',
  volume: 'm11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
