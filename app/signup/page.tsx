'use client';

// 회원가입 페이지 — 사전 승인된 이름만 가입 허용 S
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

const inputCls =
  'w-full text-[14px] text-text-base bg-surface-2 border border-border rounded-md px-3 py-2 ' +
  'outline-none placeholder:text-[#6b6b6b] transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-green focus:shadow-[0_0_0_3px_rgba(30,215,96,0.25)]';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [otp, setOtp]           = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !otp || !email || !password || loading) return;
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), otp: otp.trim(), email: email.trim(), password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/login'), 2500);
  };

  return (
    <>
      <style>{`
        @keyframes check-pop {
          0%{transform:scale(0)} 60%{transform:scale(1.12)} 100%{transform:scale(1)}
        }
      `}</style>

      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center px-4 pt-8 pb-6">

        {/* Logo */}
        <div className="w-12 h-12 rounded-full bg-green flex items-center justify-center mt-4">
          <Image src="/moguk_logo.svg" alt="오량모의국회" width={30} height={30} className="brightness-0" />
        </div>

        <h1 className="text-[24px] font-light tracking-[-0.5px] text-text-base text-center mt-6 mb-4">
          의원 계정 등록
        </h1>

        {success ? (
          /* 성공 상태 */
          <div className="w-full max-w-[308px] bg-surface border border-[var(--hairline-strong)] rounded-md px-5 py-9 text-center">
            <div
              className="w-14 h-14 rounded-full bg-[rgba(30,215,96,0.15)] flex items-center justify-center mx-auto mb-4"
              style={{ animation: 'check-pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-text-base mb-2">가입 완료!</h2>
            <p className="text-[14px] text-text-secondary leading-[1.6]">
              계정이 생성되었습니다.
              <br />
              잠시 후 로그인 페이지로 이동합니다.
            </p>
          </div>
        ) : (
          <>
            {/* Error message */}
            {error && (
              <div className="w-full max-w-[308px] flex items-start gap-2 text-[13px] text-negative bg-[rgba(243,114,127,0.1)] border border-[rgba(243,114,127,0.35)] rounded-md px-3.5 py-3 mb-4">
                <AlertCircle size={15} className="shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            {/* Signup card */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="w-full max-w-[308px] bg-surface border border-[var(--hairline-strong)] rounded-md p-5 flex flex-col"
            >
              <label htmlFor="su-name" className="text-[14px] font-medium text-text-base mb-2">
                이름 (배정된 이름)
              </label>
              <input
                id="su-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                autoComplete="name"
                className={inputCls + ' mb-1'}
              />
              <p className="text-[12px] text-text-secondary mb-4">
                운영진에게 사전 배정받은 이름으로만 가입할 수 있습니다.
              </p>

              <label htmlFor="su-otp" className="text-[14px] font-medium text-text-base mb-2">
                OTP
              </label>
              <input
                id="su-otp"
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                autoComplete="off"
                className={inputCls + ' mb-4 tracking-[2px]'}
              />

              <label htmlFor="su-email" className="text-[14px] font-medium text-text-base mb-2">
                이메일
              </label>
              <input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                className={inputCls + ' mb-4'}
              />

              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="su-pw" className="text-[14px] font-medium text-text-base">
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
                id="su-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
                className={inputCls + ' mb-1'}
              />
              <p className="text-[12px] text-text-secondary mb-4">8자 이상 입력해주세요.</p>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name || !otp || !email || !password}
                className="w-full flex items-center justify-center gap-2 px-3 py-[9px] rounded-md border border-green-border bg-green text-black text-[14px] font-bold cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  '가입하기'
                )}
              </button>
            </form>

            {/* Login box */}
            <div className="w-full max-w-[308px] border border-[var(--hairline-strong)] rounded-md px-5 py-4 mt-4 text-center text-[14px] text-text-secondary">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-green hover:underline">로그인</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
