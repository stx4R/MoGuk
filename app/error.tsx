'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <AlertCircle size={48} className="text-negative mb-4" />
      <h2 className="text-2xl font-bold text-text-base mb-2">
        오류가 발생했습니다
      </h2>
      <p className="text-text-secondary text-sm mb-8 max-w-sm">
        잠시 후 다시 시도해주세요. 문제가 지속되면 운영진에게 문의하세요.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green text-black font-semibold text-sm hover:brightness-110 transition-all"
      >
        <RefreshCw size={15} />
        다시 시도
      </button>
    </div>
  );
}
