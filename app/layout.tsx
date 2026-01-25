import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carnatic Practice - Tanpura",
  description: "Practice Carnatic vocal exercises with a digital tanpura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
