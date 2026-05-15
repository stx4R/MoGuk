'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Sun, Moon, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { label: 'About', href: '/about' },
  { label: 'Vote', href: '/vote' },
  { label: 'Chat', href: '/chat' },
  { label: 'Help', href: '/help' },
];

const STAFF_ROLES = new Set(['admin', 'mod']);

type Profile = { name: string; role: string; pp: string };

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-primary/10 text-red-primary border border-red-primary/30',
  mod:   'bg-yellow-primary/10 text-yellow-primary border border-yellow-primary/30',
  user:  'bg-green-400/10 text-green-600 dark:text-green-400 border border-green-400/30',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  mod:   'Mod',
  user:  'User',
};

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  '보수':   'bg-red-primary/15 text-red-primary border border-red-primary/30',
  '중도':   'bg-yellow-primary/15 text-yellow-primary border border-yellow-primary/30',
  '무소속': 'bg-gray-400/15 text-gray-500 dark:text-gray-400 border border-gray-400/30',
};

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<SupabaseUser | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('name, role, pp')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as Profile);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/');
    router.refresh();
  };

  const badgeClass  = profile ? (ROLE_BADGE[profile.role]  ?? ROLE_BADGE.user)  : '';
  const badgeLabel  = profile ? (ROLE_LABEL[profile.role]  ?? profile.role)      : '';
  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? '';

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
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface"
              >
                {item.label}
              </Link>
            ))}
            {user && profile && STAFF_ROLES.has(profile.role) && (
              <Link
                href="/admin-dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface"
              >
                Dashboard
              </Link>
            )}

            {/* 로그인 / 유저 영역 */}
            {user ? (
              <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-1.5">
                  {profile && (
                    <>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', PP_BADGE[profile.pp] ?? PP_BADGE['무소속'])}>
                        {profile.pp}
                      </span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', badgeClass)}>
                        {badgeLabel}
                      </span>
                    </>
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{displayName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-1 px-4 py-2 text-sm font-semibold rounded-lg bg-red-primary hover:bg-red-hover dark:bg-yellow-primary dark:hover:bg-yellow-hover text-white dark:text-gray-900 transition-colors"
              >
                로그인
              </Link>
            )}

            {/* 다크모드 토글 */}
            <button
              onClick={toggleTheme}
              aria-label="테마 전환"
              className="ml-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-yellow-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-all duration-200"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {user && profile && STAFF_ROLES.has(profile.role) && (
              <Link
                href="/admin-dashboard"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-primary dark:hover:text-yellow-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
              >
                Dashboard
              </Link>
            )}

            {/* 모바일 로그인 / 로그아웃 */}
            {user ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg">
                {profile && (
                  <>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0', PP_BADGE[profile.pp] ?? PP_BADGE['무소속'])}>
                      {profile.pp}
                    </span>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0', badgeClass)}>
                      {badgeLabel}
                    </span>
                  </>
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{displayName}</span>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-primary dark:text-yellow-primary shrink-0"
                >
                  <LogOut size={15} />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-semibold text-red-primary dark:text-yellow-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
