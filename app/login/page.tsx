'use client';

// 로그인 페이지 — 데스크탑 50:50, Material Design 라벨 애니메이션 S
import { useState } from 'react';
import { Eye, EyeOff, Scale, LogIn } from 'lucide-react';
import { cn } from '@/utils/cn';

function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative mt-6">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={id}
        className="peer w-full px-4 pt-5 pb-2.5 rounded-xl border-2 bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm outline-none transition-all duration-200 border-gray-200 dark:border-dark-border focus:border-red-primary dark:focus:border-yellow-primary"
      />
      <label
        htmlFor={id}
        className={cn(
          'absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none transition-all duration-200 origin-left',
          lifted
            ? 'top-2 text-xs scale-90 text-red-primary dark:text-yellow-primary'
            : 'top-1/2 -translate-y-1/2 text-sm'
        )}
      >
        {label}
      </label>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Supabase auth.signInWithPassword 연동
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* 좌측 그래픽 패널 (데스크탑만) */}
      <div className="hidden md:flex w-1/2 bg-red-primary dark:bg-dark-surface items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-white"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center text-white px-12">
          <Scale size={64} className="mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-extrabold mb-3">오량모의국회</h2>
          <p className="text-red-100 dark:text-gray-300 text-sm leading-relaxed">
            의원 계정으로 로그인하여
            <br />
            안건 투표에 참여하세요.
          </p>
        </div>
      </div>

      {/* 우측 폼 패널 */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
            로그인
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            이메일과 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-0">
            <FloatingInput
              id="email"
              label="이메일"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <div className="relative">
              <FloatingInput
                id="password"
                label="비밀번호"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className={cn(
                'w-full mt-8 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200',
                'bg-red-primary hover:bg-red-hover dark:bg-yellow-primary dark:hover:bg-yellow-hover text-white dark:text-gray-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
              ) : (
                <>
                  <LogIn size={16} />
                  로그인
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
