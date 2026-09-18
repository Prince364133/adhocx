'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LucideIcon,
  LayoutDashboard,
  ClipboardList,
  Navigation,
  Truck,
  ShieldCheck,
  Car,
  Users,
  CreditCard,
  Wallet,
  Tag,
  Ticket,
  Newspaper,
  Scale,
  BarChart3,
  FileText,
} from 'lucide-react';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/requirements', label: 'Requirements', icon: ClipboardList },
      { href: '/trips', label: 'Trips & Telemetry', icon: Navigation },
      { href: '/assignments', label: 'Assignments', icon: Truck },
    ],
  },
  {
    title: 'MARKETPLACE',
    items: [
      { href: '/verifications', label: 'Verification Center', icon: ShieldCheck },
      { href: '/drivers', label: 'Driver Fleet', icon: Car },
      { href: '/users', label: 'Users & Vendors', icon: Users },
    ],
  },
  {
    title: 'FINANCE & BILLING',
    items: [
      { href: '/settlements', label: 'Settlements', icon: CreditCard },
      { href: '/payments', label: 'Payments & Escrow', icon: Wallet },
      { href: '/pricing', label: 'Pricing & Tariffs', icon: Tag },
    ],
  },
  {
    title: 'GROWTH & CONTENT',
    items: [
      { href: '/coupons', label: 'Coupons & Promos', icon: Ticket },
      { href: '/blogs', label: 'Blog & Content', icon: Newspaper },
      { href: '/disputes', label: 'Disputes & Support', icon: Scale },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { href: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
      { href: '/audit', label: 'Audit Logs', icon: FileText },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <AdhocxBrandLogo size={34} subtitle="Control Portal" />
      </div>

      <nav
        style={{
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navSections.map((sec, sIdx) => (
          <div key={sIdx}>
            {sec.title && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  padding: '0 0.75rem',
                  marginBottom: '0.4rem',
                }}
              >
                {sec.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {sec.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                      boxShadow: isActive ? 'var(--shadow-glow-purple)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <item.icon size={17} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--brand-primary-subtle)',
                          color: isActive ? '#ffffff' : 'var(--brand-primary)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
