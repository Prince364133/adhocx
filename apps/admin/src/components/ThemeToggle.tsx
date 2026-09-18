'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemeOption = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('adhocx_theme') as ThemeOption) || 'light';
    setTheme(stored);
    applyTheme(stored);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = (localStorage.getItem('adhocx_theme') as ThemeOption) || 'light';
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
          width: '90px',
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.15rem',
        padding: '0.2rem',
        backgroundColor: 'var(--bg-card-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        transition: 'all 0.2s ease',
      }}
      title={`Theme: ${theme === 'light' ? 'Light Mode (Default)' : theme === 'dark' ? 'Dark Mode' : 'System Preference'}`}
    >
      {/* Light Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme('light')}
        style={{
          padding: '0.3rem 0.55rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'light' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'light' ? '#ffffff' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontWeight: 600,
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Light Mode"
      >
        <Sun size={13} />
        <span style={{ fontSize: '0.6875rem' }}>Light</span>
      </button>

      {/* Dark Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme('dark')}
        style={{
          padding: '0.3rem 0.55rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'dark' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'dark' ? '#ffffff' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontWeight: 600,
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Dark Mode"
      >
        <Moon size={13} />
        <span style={{ fontSize: '0.6875rem' }}>Dark</span>
      </button>

      {/* Auto / System */}
      <button
        type="button"
        onClick={() => handleSelectTheme('system')}
        style={{
          padding: '0.3rem 0.45rem',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'system' ? 'var(--brand-primary)' : 'transparent',
          color: theme === 'system' ? '#ffffff' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Auto / System Preference"
      >
        <Monitor size={13} />
      </button>
    </div>
  );
};
