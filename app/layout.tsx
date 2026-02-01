import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carnatic Practice - Tanpura",
  description: "Practice Carnatic vocal exercises with a digital tanpura",
};

const themeScript = `
(function() {
  try {
    var s = localStorage.getItem('settings');
    if (s) {
      var o = JSON.parse(s);
      if (o.theme && ['light','light-warm','dark','dark-slate'].indexOf(o.theme) >= 0)
        document.documentElement.dataset.theme = o.theme;
      if (o.accentColor && /^#[0-9A-Fa-f]{6}$/.test(o.accentColor))
        document.documentElement.style.setProperty('--accent', o.accentColor);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
