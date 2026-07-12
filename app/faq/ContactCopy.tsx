'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

const PHONE = '010-2100-1648';
const EMAIL = 'suppuding@gmail.com';

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    const ok = await navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    if (ok) return true;
  }
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

export default function ContactCopy() {
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

  const btnCls =
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold ' +
    'bg-green text-black hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer';

  return (
    <div className="mt-12 border border-[var(--hairline-strong)] rounded-2xl p-6 text-center">
      <p className="text-[15px] font-bold text-text-base mb-1">더 궁금한 점이 있으신가요?</p>
      <p className="text-[13px] text-text-secondary mb-5">아래로 운영진에게 문의해주세요.</p>
      <div className="flex gap-2.5 justify-center flex-wrap">
        <button type="button" onClick={() => handleCopy(PHONE, '연락처가 복사되었습니다.')} className={btnCls}>
          <Copy size={14} />
          연락처 복사
        </button>
        <button type="button" onClick={() => handleCopy(EMAIL, '이메일이 복사되었습니다.')} className={btnCls}>
          <Copy size={14} />
          이메일 복사
        </button>
      </div>

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
    </div>
  );
}
