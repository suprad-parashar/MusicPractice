import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/bravura/400.css';
import { DEFAULT_ACCENT, DEFAULT_THEME, THEMES, accentForeground } from '@/lib/theme';
import { storageKey } from '@/lib/storage';
import './globals.css';

export const metadata: Metadata = {
  title: 'Carnatic Practice · Your daily saadhana',
  description:
    'A thoughtful space for Carnatic music. Explore ragas, practice swaras, train your ear, and learn with a digital tanpura.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Use the same storage key and defaults as the settings hook, before the first paint.
const themeScript = `(() => {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(${JSON.stringify(storageKey('settings'))})) || {}; } catch {}
  const root = document.documentElement;
  const theme = settings.theme === 'high-contrast' ? 'dark' : settings.theme;
  root.dataset.theme = ${JSON.stringify(THEMES.map(({ id }) => id))}.includes(theme) ? theme : ${JSON.stringify(DEFAULT_THEME)};
  const accent = /^#[0-9a-f]{6}$/i.test(settings.accentColor) ? settings.accentColor : ${JSON.stringify(DEFAULT_ACCENT)};
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-rgb', accent.slice(1).match(/.{2}/g).map(part => parseInt(part, 16)).join(' '));
  root.style.setProperty('--accent-foreground', (${accentForeground.toString()})(accent));
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
