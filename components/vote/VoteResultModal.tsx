// /voteresult 명령어 수신 시 전원(Guest 포함)에게 결과 팝업 표시 S
'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type VoteResult = {
  id: string;
  title: string;
  description: string | null;
  yes_count: number;
  no_count: number;
  abstain_count: number;
  total_voted: number;
  total_users: number;
  admin_name: string;
};

export default function VoteResultModal() {
  const [result, setResult] = useState<VoteResult | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('vote-result-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vote_result_broadcasts' },
        (payload) => { setResult(payload.new as VoteResult); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!result) return null;

  const totalVoted = result.total_voted || 1;
  const totalUsers = result.total_users || 1;
  const participationPct = Math.round((result.total_voted / totalUsers) * 100);
  const yesPct  = Math.round((result.yes_count  / totalVoted) * 100);
  const noPct   = Math.round((result.no_count   / totalVoted) * 100);
  const abstainPct = 100 - yesPct - noPct;

  const bars = [
    { label: '찬성', count: result.yes_count,     pct: yesPct,     bar: 'bg-yellow-primary', text: 'text-yellow-600 dark:text-yellow-400' },
    { label: '반대', count: result.no_count,      pct: noPct,      bar: 'bg-red-primary',    text: 'text-red-primary' },
    { label: '기권', count: result.abstain_count, pct: abstainPct, bar: 'bg-gray-400',       text: 'text-gray-500 dark:text-gray-400' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-red-primary dark:bg-yellow-primary px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/70 dark:text-gray-900/70 uppercase tracking-wider mb-0.5">
              투표 결과 공개
            </p>
            <h2 className="text-lg font-extrabold text-white dark:text-gray-900 leading-tight">
              {result.title}
            </h2>
          </div>
          <button
            onClick={() => setResult(null)}
            className="p-1.5 rounded-lg text-white/80 dark:text-gray-900/70 hover:bg-white/15 dark:hover:bg-black/10 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5">
          {result.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-l-2 border-red-primary/30 dark:border-yellow-primary/30 pl-3 whitespace-pre-line">
              {result.description}
            </p>
          )}

          {/* 전체 투표율 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-bold text-gray-700 dark:text-gray-200">전체 투표율</span>
              <span className="text-gray-500 dark:text-gray-400">
                {result.total_voted}명 / {result.total_users}명 ({participationPct}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400 dark:bg-gray-500 transition-all duration-700"
                style={{ width: `${participationPct}%` }}
              />
            </div>
          </div>

          {/* 찬성/반대/기권 막대 */}
          <div className="space-y-3">
            {bars.map(({ label, count, pct, bar, text }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={`font-bold ${text}`}>{label}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {count}명 ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
            공지 · {result.admin_name}
          </p>
        </div>
      </div>
    </div>
  );
}
