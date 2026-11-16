"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export type ThemeOption = "light" | "dark" | "system";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<ThemeOption>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored =
      (localStorage.getItem("adhocx_theme") as ThemeOption) || "light";
    setTheme(stored);
    applyTheme(stored);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current =
        (localStorage.getItem("adhocx_theme") as ThemeOption) || "light";
      if (current === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  function applyTheme(mode: ThemeOption) {
    const root = document.documentElement;
    if (mode === "dark") {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (mode === "light") {
      root.setAttribute("data-theme", "light");
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.removeAttribute("data-theme");
      const isSystemDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (isSystemDark) {
        root.setAttribute("data-theme", "dark");
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.setAttribute("data-theme", "light");
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }
  }

  function handleSelectTheme(mode: ThemeOption) {
    setTheme(mode);
    localStorage.setItem("adhocx_theme", mode);
    applyTheme(mode);
  }

  if (!mounted) {
    return (
      <div
        className="inline-flex items-center bg-card-elevated border border-subtle rounded-full"
        style={{
          gap: "0.15rem",
          padding: "0.2rem",
          height: "28px",
          width: "74px",
        }}
      />
    );
  }

  return (
    <div
      className="inline-flex items-center bg-card-elevated border border-subtle rounded-full"
      style={{
        gap: "0.125rem",
        padding: "0.15rem",
        transition: "all 0.2s ease",
      }}
      title={`Theme: ${theme === "light" ? "Light Mode (Default)" : theme === "dark" ? "Dark Mode" : "System Preference"}`}
    >
      {/* Light Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme("light")}
        className="rounded-full border-0 cursor-pointer inline-flex items-center justify-center"
        style={{
          padding: "0.25rem 0.4rem",
          backgroundColor:
            theme === "light" ? "var(--brand-primary)" : "transparent",
          color: theme === "light" ? "#ffffff" : "var(--text-muted)",
          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun size={12} />
      </button>

      {/* Dark Mode */}
      <button
        type="button"
        onClick={() => handleSelectTheme("dark")}
        className="rounded-full border-0 cursor-pointer inline-flex items-center justify-center"
        style={{
          padding: "0.25rem 0.4rem",
          backgroundColor:
            theme === "dark" ? "var(--brand-primary)" : "transparent",
          color: theme === "dark" ? "#ffffff" : "var(--text-muted)",
          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon size={12} />
      </button>

      {/* Auto / System */}
      <button
        type="button"
        onClick={() => handleSelectTheme("system")}
        className="rounded-full border-0 cursor-pointer inline-flex items-center justify-center"
        style={{
          padding: "0.25rem 0.4rem",
          backgroundColor:
            theme === "system" ? "var(--brand-primary)" : "transparent",
          color: theme === "system" ? "#ffffff" : "var(--text-muted)",
          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        title="Auto / System Preference"
        aria-label="Auto / System Preference"
      >
        <Monitor size={12} />
      </button>
    </div>
  );
};
