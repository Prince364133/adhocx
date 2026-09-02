import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'AdhocX Control Portal',
  description: 'Operations, Compliance and Financial Management for AdhocX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          <Sidebar />
          <div className="admin-main">
            <Header />
            <div className="admin-content">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
