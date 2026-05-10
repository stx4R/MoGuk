'use client';

// 상단 고정 GNB — 스크롤 블러, 모바일 햄버거, 다크모드 토글 S
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { label: 'About', href: '/about' },
  { label: 'Vote', href: '/vote' },
  { label: 'Bug Report', href: 'https://github.com/stx4R/Oryang-MOGUK/issues', external: true },
  { label: 'Login', href: '/login' },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md shadow-sm'
          : 'bg-white dark:bg-dark-bg',
        'border-b border-gray-100 dark:border-dark-border'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-red-primary hover:opacity-80 transition-opacity shrink-0"
          >
            <span className="text-yellow-primary">⚖</span>
            오량모의국회
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface"
                >
                  {item.label}
                </Link>
              )
            )}

            {/* 다크모드 토글 */}
            <button
              onClick={toggleTheme}
              aria-label="테마 전환"
              className="ml-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-yellow-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-all duration-200"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="dark:glow-yellow" />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </nav>

          {/* 모바일: 햄버거 + 다크모드 */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="테마 전환"
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="메뉴 열기"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-bg">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
