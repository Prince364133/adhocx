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
          gap: '2px',
          padding: '2px',
          backgroundColor: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-pill)',
          height: '28px',
          width: '78px',
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px',
        backgroundColor: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        transition: 'all 0.2s ease',
      }}
      title={`Theme: ${theme === 'light' ? 'Light Mode (Default)' : theme === 'dark' ? 'Dark Mode (Black & Gray)' : 'System'}`}
    >
      {/* Light Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme('light')}
        style={{
          padding: '3px 6px',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'light' ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
          color: theme === 'light' ? '#FFFFFF' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        aria-label="Set Light Theme"
      >
        <Sun size={13} />
      </button>

      {/* Dark Mode (Black & Gray) */}
      <button
        type="button"
        onClick={() => handleSelectTheme('dark')}
        style={{
          padding: '3px 6px',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'dark' ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
          color: theme === 'dark' ? '#FFFFFF' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        aria-label="Set Black & Gray Dark Theme"
      >
        <Moon size={13} />
      </button>

      {/* System Preference */}
      <button
        type="button"
        onClick={() => handleSelectTheme('system')}
        style={{
          padding: '3px 6px',
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          backgroundColor: theme === 'system' ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
          color: theme === 'system' ? '#FFFFFF' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        aria-label="Follow System Theme"
      >
        <Monitor size={13} />
      </button>
    </div>
  );
};

