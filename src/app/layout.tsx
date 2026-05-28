import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Maap",
  description: "Precise wood measurement.",
  // Browser-tab favicon (served as a static file in /public, avoids the
  // app/icon.* convention which can 500 on some Node hosts).
  icons: { icon: "/favicon.svg" },
  // iOS: launch standalone from the home screen. (Emits the apple-prefixed meta.)
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Maap" },
  // The apple-mobile-web-app-capable meta is now deprecated in the spec; add the
  // standard mobile-web-app-capable alongside it so modern browsers stop warning
  // (iOS still relies on the apple-prefixed one for standalone launch).
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // Warm off-white matches --bg so the browser chrome doesn't flash white.
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  // Field use: allow zoom for accessibility, lock default scale for tap targets.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set the theme class before paint to avoid a flash. Reads the saved
            preference, falling back to the OS setting. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        {/* Satoshi via Fontshare, JetBrains Mono via Google Fonts (design.md §B).
            These links live in the root layout head, so they load on every
            route - the no-page-custom-font rule's "single page" premise doesn't
            apply. Self-hosting through next/font is a Phase 3 performance task. */}
        {/* eslint-disable @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}
      </head>
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
