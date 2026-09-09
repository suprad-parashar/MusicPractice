export const THEMES = [
  { id: 'light-warm', label: 'Linen', color: '#f7f6f2' },
  { id: 'light', label: 'Daylight', color: '#eef2f5' },
  { id: 'dark', label: 'Evening', color: '#252823' },
  { id: 'dark-slate', label: 'Midnight', color: '#202936' },
] as const;

export type ThemeMode = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeMode = 'light-warm';
export const DEFAULT_ACCENT = '#a34e35';
export const ACCENTS = [
  { name: 'Terracotta', value: DEFAULT_ACCENT },
  { name: 'Olive', value: '#566344' },
  { name: 'Ocean', value: '#36658c' },
  { name: 'Plum', value: '#805471' },
  { name: 'Amber', value: '#a26c1d' },
];

export function isTheme(value: unknown): value is ThemeMode {
  return THEMES.some(({ id }) => id === value);
}

export function isAccent(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/** Pick the text color with the higher WCAG contrast against a custom accent. */
export function accentForeground(hex: string): string {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#171a16' : '#ffffff';
}

export function applyTheme(theme: ThemeMode, accent: string) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty('--accent', accent);
  root.style.setProperty(
    '--accent-rgb',
    accent
      .slice(1)
      .match(/.{2}/g)!
      .map((part) => parseInt(part, 16))
      .join(' '),
  );
  root.style.setProperty('--accent-foreground', accentForeground(accent));
}
