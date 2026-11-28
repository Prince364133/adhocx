import type { Metadata } from 'next';
import './globals.css';
import { FleetShell } from '../components/layout/FleetShell';

export const metadata: Metadata = {
  title: 'AdhocX Fleet Portal',
  description: 'Dedicated portal for AdhocX fleet owners and administrators',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FleetShell>{children}</FleetShell>
      </body>
    </html>
  );
}
