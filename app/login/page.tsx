'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Open Redirect 방지 화이트리스트 S
const VALID_REDIRECT = new Set(['/vote', '/admin-dashboard']);
function safeRedirect(raw: string | null): string {
  return raw && VALID_REDIRECT.has(raw) ? raw : '/';
}

const inputCls =
  'w-full text-[14px] text-text-base bg-surface-2 border border-border rounded-md px-3 py-2 ' +
  'outline-none placeholder:text-[#6b6b6b] transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-green focus:shadow-[0_0_0_3px_rgba(30,215,96,0.25)]';

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && session) {
        router.replace(safeRedirect(searchParams.get('redirectTo')));
      }
    });
    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    // 새로 발급된 세션 쿠키를 서버(proxy)가 즉시 인식하도록 하드 내비게이션 사용 —
    // soft router 전환 시 쿠키 전파 레이스로 '환영' 오버레이에 멈추던 문제 방지 S
    setTimeout(() => {
      window.location.assign(safeRedirect(searchParams.get('redirectTo')));
    }, 1100);
  };

  return (
    <>
      <style>{`
        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes check-pop {
          0%{transform:scale(0)} 60%{transform:scale(1.12)} 100%{transform:scale(1)}
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center px-4 pt-8 pb-6">

        {/* Logo */}
        <div className="w-12 h-12 rounded-full bg-green flex items-center justify-center mt-4">
          <Image src="/moguk_logo.svg" alt="오량모의국회" width={30} height={30} className="brightness-0" />
        </div>

        <h1 className="text-[24px] font-light tracking-[-0.5px] text-text-base text-center mt-6 mb-4">
          오량모의국회 로그인
        </h1>

        {/* Error message */}
        {error && (
          <div className="w-full max-w-[308px] flex items-start gap-2 text-[13px] text-negative bg-[rgba(243,114,127,0.1)] border border-[rgba(243,114,127,0.35)] rounded-md px-3.5 py-3 mb-4">
            <AlertCircle size={15} className="shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full max-w-[308px] bg-surface border border-[var(--hairline-strong)] rounded-md p-5 flex flex-col"
        >
          <label htmlFor="li-email" className="text-[14px] font-medium text-text-base mb-2">
            이메일
          </label>
          <input
            id="li-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="member@moguk.kr"
            autoComplete="email"
            className={inputCls + ' mb-4'}
          />

          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="li-pw" className="text-[14px] font-medium text-text-base">
              비밀번호
            </label>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="text-[12px] text-green cursor-pointer"
            >
              {showPw ? '숨기기' : '표시'}
            </button>
          </div>
          <input
            id="li-pw"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputCls + ' mb-4'}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2 px-3 py-[9px] rounded-md border border-green-border bg-green text-black text-[14px] font-bold cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              '로그인'
            )}
          </button>
        </form>

        {/* Signup box */}
        <div className="w-full max-w-[308px] border border-[var(--hairline-strong)] rounded-md px-5 py-4 mt-4 text-center text-[14px] text-text-secondary">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-green hover:underline">회원가입</Link>
        </div>
      </div>

      {/* ── Success overlay ── */}
      {success && (
        <div
          className="fixed inset-0 z-80 flex flex-col items-center justify-center gap-4"
          style={{
            background: 'rgba(10,10,10,0.86)',
            backdropFilter: 'blur(6px)',
            animation: 'overlay-in 0.3s ease',
          }}
        >
          <div
            className="w-[84px] h-[84px] rounded-full bg-green flex items-center justify-center"
            style={{
              animation: 'check-pop 0.5s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 0 40px rgba(30,215,96,0.5)',
            }}
          >
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: 'check-draw 0.4s 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[18px] font-bold text-text-base">환영합니다, 의원님!</p>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
