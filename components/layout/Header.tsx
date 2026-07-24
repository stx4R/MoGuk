'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

type Profile = { name: string; role: string; pp: string };

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-[rgba(243,114,127,0.15)]', text: 'text-negative' },
  mod:   { bg: 'bg-[rgba(255,164,43,0.15)]',  text: 'text-warning' },
  user:  { bg: 'bg-[rgba(30,215,96,0.15)]',   text: 'text-green' },
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  mod:   'Mod',
  user:  'User',
};

const PP_BADGE: Record<string, { bg: string; text: string }> = {
  '진보':   { bg: 'bg-[rgba(83,157,245,0.15)]',  text: 'text-jinbo' },
  '보수':   { bg: 'bg-[rgba(243,114,127,0.15)]', text: 'text-negative' },
  '중도':   { bg: 'bg-[rgba(255,255,255,0.08)]', text: 'text-text-secondary' },
  '무소속': { bg: 'bg-[rgba(255,255,255,0.08)]', text: 'text-text-secondary' },
};

export default function Header() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<SupabaseUser | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);

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
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  };

  const roleBadge = profile ? (ROLE_BADGE[profile.role] ?? ROLE_BADGE.user) : null;
  const ppBadge   = profile ? (PP_BADGE[profile.pp]   ?? PP_BADGE['무소속']) : null;
  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? '';

  const isStaff = profile?.role === 'admin' || profile?.role === 'mod';
  const navLinks = [
    { label: '투표', href: '/vote' },
    ...(isStaff ? [{ label: '대시보드', href: '/admin-dashboard' }] : []),
  ];

  return (
    // 서비스 종료: pointer-events-none 으로 헤더 인터랙션 차단 (복구 시 제거)
    <header className="pointer-events-none sticky top-[env(safe-area-inset-top)] z-50 w-full bg-[rgba(18,18,18,0.72)] backdrop-blur-[14px] saturate-[160%] border-b border-[var(--hairline)]">
      <div className="max-w-[var(--maxw)] mx-auto px-6 h-16 flex items-center gap-4">

        <Link
          href="/"
          className="flex items-center gap-2.5 font-extrabold text-[17px] tracking-[-0.02em] text-text-base shrink-0"
        >
          <span className="w-[30px] h-[30px] rounded-full bg-green flex items-center justify-center shrink-0">
            <Image
              src="/moguk_logo.svg"
              alt="오량모의국회"
              width={22}
              height={22}
              className="brightness-0"
            />
          </span>
          오량모의국회
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-text-secondary hover:text-text-base transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[var(--hairline-strong)]">
          {user ? (
            <>
              {profile && (
                <div className="flex items-center gap-1.5">
                  {ppBadge && (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold',
                      ppBadge.bg, ppBadge.text
                    )}>
                      {profile.pp}
                    </span>
                  )}
                  {roleBadge && (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold',
                      roleBadge.bg, roleBadge.text
                    )}>
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </span>
                  )}
                  <span className="text-sm text-text-secondary">{displayName}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-text-secondary hover:text-text-base hover:bg-surface-hover transition-colors duration-150"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-5 py-2 rounded-full text-sm font-bold bg-green text-black hover:brightness-110 transition-all duration-150"
            >
              로그인
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="메뉴 열기"
          className="md:hidden ml-auto p-2 text-text-secondary hover:text-text-base transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--hairline)] bg-bg-base">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-semibold text-text-secondary hover:text-text-base rounded-full hover:bg-surface-hover transition-colors"
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-2 px-4 py-3">
                {profile && ppBadge && (
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0', ppBadge.bg, ppBadge.text)}>
                    {profile.pp}
                  </span>
                )}
                {profile && roleBadge && (
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0', roleBadge.bg, roleBadge.text)}>
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </span>
                )}
                <span className="text-sm text-text-secondary flex-1 truncate">{displayName}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-semibold text-negative shrink-0"
                >
                  <LogOut size={14} />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mx-4 my-2 py-3 text-center text-sm font-bold rounded-full bg-green text-black"
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
