'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check } from 'lucide-react';

const PHONE = '010-2100-1648';
const EMAIL = 'suppuding@gmail.com';

const SITE_LINKS = [
  { label: '주요 기능', href: 'https://classroom.google.com/c/ODU0ODA1OTY5ODY1/m/ODY2NDQ2ODQ3NTI4/details', external: true },
  { label: '시작하기', href: '/login' },
  { label: '계정 가입', href: '/signup' },
];

const POLICY_LINKS = [
  { label: '이용약관',         href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
  { label: '운영정책',         href: '/operation' },
];

// 하단 개발팀 크레딧 — 정책명이 아닌 실제 개발자 핸들 S
const CREDITS = [
  { label: 'stx4R',      href: 'https://github.com/stx4R' },
  { label: 'kmc11005',   href: 'https://github.com/kmc11005' },
  { label: 'heejae0105', href: 'https://github.com/heejae0105' },
];

const linkCls =
  'text-[13px] text-text-secondary hover:text-text-base transition-colors duration-150 ' +
  'underline underline-offset-[3px] decoration-[#5a5a5a] hover:decoration-current';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function Footer() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const handleCopy = async (text: string, okMsg: string) => {
    const ok = await copyText(text);
    showToast(ok ? okMsg : '복사에 실패했습니다. 다시 시도해주세요.');
  };

  return (
    <footer className="border-t border-[var(--hairline)] bg-[#0d0d0d]">
      <div className="max-w-[var(--maxw)] mx-auto px-6 pt-14 pb-10">

        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">

          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-extrabold text-[17px] tracking-[-0.02em] text-text-base mb-4"
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
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-[28ch]">
              제 3회 오량모의국회 공식 웹사이트로써 전자투표 플랫폼으로 활용됩니다.
            </p>
          </div>

          {/* Col 2: 서비스 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">서비스</h4>
            <ul className="flex flex-col gap-2.5">
              {SITE_LINKS.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className={linkCls}>{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: 지원 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">지원</h4>
            <ul className="flex flex-col gap-2.5 items-start">
              <li>
                <button
                  type="button"
                  onClick={() => handleCopy(PHONE, '연락처가 복사되었습니다.')}
                  className={linkCls + ' text-left cursor-pointer'}
                >
                  문의 연락처
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleCopy(EMAIL, '이메일이 복사되었습니다.')}
                  className={linkCls + ' text-left cursor-pointer'}
                >
                  문의 이메일
                </button>
              </li>
              <li>
                <a href="https://stx4r.github.io/MoGuk---Ask/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                  자주 묻는 질문
                </a>
              </li>
              <li>
                <Link href="/help" className={linkCls}>오류 신고</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: 정책 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">정책</h4>
            <ul className="flex flex-col gap-2.5">
              {POLICY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkCls}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--hairline)] mt-11 pt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-[#6f6f6f]">
            © 2026 제 3회 오량모의국회. All rights reserved.
          </p>
          <p className="text-[12px] text-[#6f6f6f]">
            Developed by © 김윤철 팬클럽 - {' '}
            {CREDITS.map((c, i) => (
              <span key={c.label}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary font-semibold hover:text-green transition-colors"
                >
                  {c.label}
                </a>
                {i < CREDITS.length - 1 && ' · '}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* 복사 완료 토스트 */}
      {toast && (
        <div className="fixed inset-x-0 bottom-8 z-[300] flex justify-center px-4 pointer-events-none">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-card border border-[var(--hairline-strong)] shadow-[var(--shadow-heavy)] text-[13px] font-semibold text-text-base"
            style={{ animation: 'fade-up 0.25s var(--ease-out)' }}
          >
            <Check size={15} className="text-green" />
            {toast}
          </div>
        </div>
      )}
    </footer>
  );
}
