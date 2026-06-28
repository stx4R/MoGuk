'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Open Redirect 방지 화이트리스트 S
const VALID_REDIRECT = new Set(['/vote', '/admin-dashboard']);
function safeRedirect(raw: string | null): string {
  return raw && VALID_REDIRECT.has(raw) ? raw : '/';
}

type MascotState = 'default' | 'look' | 'hide' | 'peek' | 'sad' | 'happy';

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [mascot, setMascot]       = useState<MascotState>('default');

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
      setMascot('sad');
      setTimeout(() => setMascot('default'), 700);
      return;
    }

    setMascot('happy');
    setSuccess(true);
    // 새로 발급된 세션 쿠키를 서버(proxy)가 즉시 인식하도록 하드 내비게이션 사용 —
    // soft router 전환 시 쿠키 전파 레이스로 '환영' 오버레이에 멈추던 문제 방지 S
    setTimeout(() => {
      window.location.assign(safeRedirect(searchParams.get('redirectTo')));
    }, 1100);
  };

  const togglePw = () => {
    const next = !showPw;
    setShowPw(next);
    setMascot(next ? 'peek' : 'hide');
  };

  return (
    <>
      {/* ── Mascot + form keyframe CSS ── */}
      <style>{`
        @keyframes floaty {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-9px); }
        }
        @keyframes mascot-shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)}
          40%{transform:translateX(9px)} 60%{transform:translateX(-7px)} 80%{transform:translateX(5px)}
        }
        @keyframes mascot-jump {
          0%,100%{transform:translateY(0)} 35%{transform:translateY(-26px)} 70%{transform:translateY(0)}
        }
        @keyframes pupil-drift {
          0%,100%{transform:translate(0,0)} 25%{transform:translate(2.5px,1px)}
          50%{transform:translate(0,1.5px)} 75%{transform:translate(-2px,0)}
        }
        @keyframes check-pop {
          0%{transform:scale(0)} 60%{transform:scale(1.12)} 100%{transform:scale(1)}
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .blob { animation: floaty 4s ease-in-out infinite; }
        .blob:nth-child(2) { animation-delay: 0.6s; }
        .blob:nth-child(3) { animation-delay: 1.2s; }
        .blob:nth-child(4) { animation-delay: 0.3s; }
        .pupil { animation: pupil-drift 3.6s ease-in-out infinite; }

        /* Look toward form */
        .mascots-look .pupil { transform: translate(5px,3px) !important; animation: none !important; }
        /* Hide (password) */
        .mascots-hide .eye { height: 4px !important; }
        .mascots-hide .blush { opacity: 1 !important; }
        /* Peek (show pw) */
        .mascots-peek .eye { height: 20px !important; }
        /* Sad */
        .mascots-sad .blob { animation: mascot-shake 0.45s !important; }
        .mascots-sad .mouth { top: 64% !important; border-radius: 16px 16px 0 0 !important; }
        .mascots-sad .pupil { transform: translateY(4px) !important; animation: none !important; }
        /* Happy */
        .mascots-happy .blob { animation: mascot-jump 0.6s cubic-bezier(0.16,1,0.3,1) !important; }
        .mascots-happy .eye { height: 10px !important; border-radius: 12px 12px 0 0 !important; }
        .mascots-happy .mouth { width: 22px !important; height: 12px !important; }
      `}</style>

      <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-2">

        {/* ── Left: Mascot stage ── */}
        <div
          className="relative hidden md:flex flex-col items-center justify-center gap-10 overflow-hidden px-12 py-12"
          style={{
            background: `
              radial-gradient(120% 90% at 30% 20%, rgba(30,215,96,0.16), transparent 60%),
              radial-gradient(100% 80% at 80% 90%, rgba(83,157,245,0.10), transparent 55%),
              #0e0e0e
            `,
          }}
        >
          {/* Concentric rings */}
          {[360, 560, 760].map((d) => (
            <div
              key={d}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: d, height: d,
                border: '1px solid rgba(255,255,255,0.05)',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Mascots */}
          <div
            className={`relative z-10 flex items-end gap-3.5 h-[220px] ${
              mascot === 'look'  ? 'mascots-look'  :
              mascot === 'hide'  ? 'mascots-hide'  :
              mascot === 'peek'  ? 'mascots-peek'  :
              mascot === 'sad'   ? 'mascots-sad'   :
              mascot === 'happy' ? 'mascots-happy' : ''
            }`}
          >
            {/* Green blob */}
            <div className="blob relative">
              <div className="body" style={{ width:120, height:120, borderRadius:'50% 50% 46% 46%', background:'linear-gradient(160deg,#34e979,#14b84e)' }} />
              <MascotFace hasBlush />
            </div>
            {/* Tall gray blob */}
            <div className="blob relative">
              <div className="body" style={{ width:76, height:168, borderRadius:40, background:'linear-gradient(160deg,#3a3a3a,#232323)' }} />
              <MascotFace isTall />
            </div>
            {/* Pink blob */}
            <div className="blob relative">
              <div className="body" style={{ width:92, height:110, borderRadius:'50% 50% 44% 44%', background:'linear-gradient(160deg,#ff8a96,#e35664)' }} />
              <MascotFace hasBlush />
            </div>
            {/* Bird blob */}
            <div className="blob relative">
              <div
                className="body relative"
                style={{ width:64, height:84, borderRadius:'52% 52% 46% 46%', background:'linear-gradient(160deg,#cfd3d8,#9aa0a8)' }}
              >
                {/* Beak */}
                <div style={{ position:'absolute', right:-8, top:38, borderLeft:'10px solid #f1c40f', borderTop:'6px solid transparent', borderBottom:'6px solid transparent' }} />
              </div>
              <MascotFace />
            </div>
          </div>

          {/* Stage caption */}
          <div className="relative z-10 text-center max-w-[340px]">
            <div className="w-[46px] h-[46px] rounded-full bg-green flex items-center justify-center mx-auto mb-4">
              <Image src="/moguk_logo.svg" alt="" width={30} height={30} className="brightness-0" />
            </div>
            <h2 className="text-[24px] font-extrabold text-text-base tracking-[-0.02em] mb-2">오량모의국회</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              의원 계정으로 로그인하여<br />안건 투표에 참여하세요.
            </p>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="flex items-center justify-center px-6 py-12 bg-bg-base">
          <form className="w-full max-w-[380px]" onSubmit={handleSubmit} noValidate>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary hover:text-text-base mb-8 transition-colors"
            >
              <ArrowLeft size={15} />
              홈으로
            </Link>

            <h1 className="text-[30px] font-extrabold tracking-[-0.02em] text-text-base mb-1.5">
              다시 오신 걸 환영해요
            </h1>
            <p className="text-[14px] text-text-secondary mb-7">
              이메일과 비밀번호를 입력해주세요.
            </p>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-[13px] font-semibold text-negative bg-[rgba(243,114,127,0.1)] border border-[rgba(243,114,127,0.25)] px-3.5 py-3 rounded-[12px] mb-4">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <label className="block text-[12px] font-bold text-text-secondary mb-2">이메일</label>
            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onFocus={() => setMascot('look')}
                onBlur={() => setMascot('default')}
                placeholder="member@moguk.kr"
                autoComplete="email"
                className="w-full text-[14px] text-text-base bg-surface-2 rounded-full px-[18px] py-[14px] outline-none transition-all duration-150"
                style={{
                  boxShadow: error
                    ? 'var(--no) 0 0 0 1px inset'
                    : 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset',
                }}
                onFocusCapture={(e) => {
                  (e.target as HTMLInputElement).style.boxShadow = '#fff 0 0 0 1px inset';
                }}
                onBlurCapture={(e) => {
                  (e.target as HTMLInputElement).style.boxShadow = error
                    ? 'var(--no) 0 0 0 1px inset'
                    : 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset';
                }}
              />
            </div>

            {/* Password */}
            <label className="block text-[12px] font-bold text-text-secondary mb-2">비밀번호</label>
            <div className="relative mb-4">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onFocus={() => setMascot('hide')}
                onBlur={() => setMascot('default')}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full text-[14px] text-text-base bg-surface-2 rounded-full px-[18px] py-[14px] pr-12 outline-none transition-all duration-150"
                style={{
                  boxShadow: error
                    ? 'var(--no) 0 0 0 1px inset'
                    : 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset',
                }}
                onFocusCapture={(e) => {
                  (e.target as HTMLInputElement).style.boxShadow = '#fff 0 0 0 1px inset';
                }}
                onBlurCapture={(e) => {
                  (e.target as HTMLInputElement).style.boxShadow = error
                    ? 'var(--no) 0 0 0 1px inset'
                    : 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset';
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={togglePw}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-base transition-colors flex"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-[15px] rounded-full text-[15px] font-bold bg-green text-black hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 mt-5"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn size={17} />
                  로그인
                </>
              )}
            </button>

            {/* Signup link */}
            <p className="text-center text-[14px] text-text-secondary mt-6">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="font-bold text-green hover:underline">
                회원가입
              </Link>
            </p>
          </form>
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

// ── Mascot face sub-component ─────────────────────────────────────
function MascotFace({ hasBlush = false, isTall = false }: { hasBlush?: boolean; isTall?: boolean }) {
  return (
    <div className="face absolute inset-0">
      {/* Eyes */}
      <div
        className="eyes absolute left-0 right-0 flex justify-center gap-3.5"
        style={{ top: isTall ? '26%' : '34%' }}
      >
        <div
          className="eye relative overflow-hidden bg-white"
          style={{ width: 20, height: 20, borderRadius: '50%', transition: 'height 0.18s ease' }}
        >
          <div
            className="pupil absolute"
            style={{ width: 9, height: 9, borderRadius: '50%', background: '#111', top: 6, left: 6 }}
          />
        </div>
        <div
          className="eye relative overflow-hidden bg-white"
          style={{ width: 20, height: 20, borderRadius: '50%', transition: 'height 0.18s ease' }}
        >
          <div
            className="pupil absolute"
            style={{ width: 9, height: 9, borderRadius: '50%', background: '#111', top: 6, left: 6 }}
          />
        </div>
      </div>
      {/* Blush */}
      {hasBlush && (
        <>
          <div className="blush absolute" style={{ top:'50%', left:'18%', width:10, height:6, borderRadius:'50%', background:'rgba(255,120,120,0.55)', opacity:0, transition:'opacity 0.25s' }} />
          <div className="blush absolute" style={{ top:'50%', right:'18%', width:10, height:6, borderRadius:'50%', background:'rgba(255,120,120,0.55)', opacity:0, transition:'opacity 0.25s' }} />
        </>
      )}
      {/* Mouth */}
      <div
        className="mouth absolute"
        style={{ top: isTall ? '40%' : '60%', left:'50%', transform:'translateX(-50%)', width:16, height:8, borderRadius:'0 0 16px 16px', background:'rgba(0,0,0,0.55)', transition:'all 0.25s ease' }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
