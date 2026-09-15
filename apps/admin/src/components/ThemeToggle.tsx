'use client';

import React, { useEffect, useState } from 'react';

export type ThemeOption = 'system' | 'dark' | 'light';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('adhocx_theme') as ThemeOption) || 'system';
    setTheme(stored);
    applyTheme(stored);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = (localStorage.getItem('adhocx_theme') as ThemeOption) || 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  function applyTheme(mode: ThemeOption) {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (mode === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.removeAttribute('data-theme');
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }

  function handleSelectTheme(mode: ThemeOption) {
    setTheme(mode);
    localStorage.setItem('adhocx_theme', mode);
    applyTheme(mode);
  }

  if (!mounted) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem',
          backgroundColor: 'var(--bg-card-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-pill)',
          height: '32px',
          width: '100px',
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding: '0.2rem',
        backgroundColor: 'var(--bg-card-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        transition: 'all 0.2s ease',
      }}
      title={`Theme: ${theme === 'system' ? 'System Preference (Auto)' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`}
    >
      {/* Auto / System */}
      <button
        type="button"
        onClick={() => handleSelectTheme('system')}
        style={{
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'system' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'system' ? '#ffffff' : 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontWeight: 600,
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Auto: Matches your device system setting"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span style={{ fontSize: '0.6875rem' }}>Auto</span>
      </button>

      {/* Dark Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme('dark')}
        style={{
          padding: '0.25rem 0.45rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'dark' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'dark' ? '#ffffff' : 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Force Dark Mode"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      {/* Light Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme('light')}
        style={{
          padding: '0.25rem 0.45rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'light' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'light' ? '#ffffff' : 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Force Light Mode"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>
    </div>
  );
};
