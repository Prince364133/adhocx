import type { Metadata } from 'next';
import './globals.css';
import { OpsShell } from '../components/layout/OpsShell';

export const metadata: Metadata = {
  title: 'AdhocX Operations & Fleet Flight Control',
  description: 'Real-time tactical fleet management, automated routing, manual overrides and live air-traffic control',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('adhocx_theme');
                var isDark = t === 'dark';
                if (isDark) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <OpsShell>{children}</OpsShell>
      </body>
    </html>
  );
}
