import type { Metadata } from 'next';
import './globals.css';
import { PortalShell } from '../components/layout/PortalShell';

export const metadata: Metadata = {
  title: 'AdhocX Corporate Portal',
  description: 'Employee commute management for AdhocX corporate clients: rosters, routes, live trips, attendance, safety and billing',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
