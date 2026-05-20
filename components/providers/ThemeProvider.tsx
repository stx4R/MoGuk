'use client';

// 다크/라이트 모드 전환 + 원형 애니메이션 컨텍스트 S
import { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: (e: React.MouseEvent) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = stored ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    applyThemeClass(initial);
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.style.setProperty('--reveal-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--reveal-y', `${e.clientY}px`);

    if (!document.startViewTransition) {
      setTheme(next);
      applyThemeClass(next);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => setTheme(next));
      applyThemeClass(next);
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
