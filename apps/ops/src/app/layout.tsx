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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <OpsShell>{children}</OpsShell>
      </body>
    </html>
  );
}

