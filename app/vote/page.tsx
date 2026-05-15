// 안건 투표 페이지 — 데스크탑: 카드 그리드, 모바일: 아코디언 S
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

type VoteChoice = 'yes' | 'no' | 'abstain' | null;

type AgendaItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  isOpen: boolean;
};

const AGENDA_ITEMS: AgendaItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `agenda-${i + 1}`,
  title: `제 ${i + 1}호 안건`,
  description: `텍스트 ${i + 1}\n\n해당 안건의 세부 내용이 여기에 기입될 예정입니다. 현재는 임시 텍스트로 구성되어 있습니다.`,
  category: ['법률안', '결의안', '예산안'][i % 3],
  yesCount: Math.floor(Math.random() * 80),
  noCount: Math.floor(Math.random() * 40),
  abstainCount: Math.floor(Math.random() * 20),
  isOpen: i < 3,
}));

function VoteBar({ yes, no, abstain }: { yes: number; no: number; abstain: number }) {
  const total = yes + no + abstain || 1;
  const yPct = Math.round((yes / total) * 100);
  const nPct = Math.round((no / total) * 100);
  const aPct = 100 - yPct - nPct;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden w-full">
        <div
          className="bg-yellow-primary transition-all duration-700"
          style={{ width: `${yPct}%` }}
        />
        <div
          className="bg-red-primary transition-all duration-700"
          style={{ width: `${nPct}%` }}
        />
        <div
          className="bg-gray-300 dark:bg-dark-border transition-all duration-700"
          style={{ width: `${aPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="text-yellow-primary font-medium">찬성 {yPct}%</span>
        <span className="text-red-primary font-medium">반대 {nPct}%</span>
        <span>기권 {aPct}%</span>
      </div>
    </div>
  );
}

function VoteCard({ item }: { item: AgendaItem }) {
  const [vote, setVote] = useState<VoteChoice>(null);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({
    yes: item.yesCount,
    no: item.noCount,
    abstain: item.abstainCount,
  });

  const handleVote = (choice: VoteChoice) => {
    if (!item.isOpen || vote === choice) return;
    // 낙관적 업데이트 S
    setCounts((prev) => {
      const next = { ...prev };
      if (vote) next[vote] = Math.max(0, next[vote] - 1);
      if (choice) next[choice] = next[choice] + 1;
      return next;
    });
    setVote(choice);
  };

  return (
    <article
      className={cn(
        'group relative rounded-2xl border bg-white dark:bg-dark-surface p-6 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl hover:shadow-red-primary/10 dark:hover:shadow-yellow-primary/10',
        item.isOpen
          ? 'border-gray-200 dark:border-dark-border'
          : 'border-gray-100 dark:border-dark-border/50 opacity-60'
      )}
    >
      {/* 카테고리 배지 */}
      <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary mb-3">
        {item.category}
      </span>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {item.title}
      </h3>

      {/* 설명 토글 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-3 transition-colors"
      >
        {open ? '접기' : '안건 내용 보기'}
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line leading-relaxed border-l-2 border-red-primary/30 dark:border-yellow-primary/30 pl-3">
          {item.description}
        </p>
      )}

      <VoteBar yes={counts.yes} no={counts.no} abstain={counts.abstain} />

      {/* 투표 버튼 */}
      <div className="flex gap-2 mt-4">
        {[
          { choice: 'yes' as VoteChoice, label: '찬성', Icon: CheckCircle2, active: 'bg-yellow-primary text-white dark:glow-yellow' },
          { choice: 'no' as VoteChoice, label: '반대', Icon: XCircle, active: 'bg-red-primary text-white' },
          { choice: 'abstain' as VoteChoice, label: '기권', Icon: MinusCircle, active: 'bg-gray-500 text-white' },
        ].map(({ choice, label, Icon, active }) => (
          <button
            key={choice}
            onClick={() => handleVote(choice)}
            disabled={!item.isOpen}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200',
              vote === choice
                ? active
                : 'border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
              !item.isOpen && 'cursor-not-allowed'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {!item.isOpen && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
          투표가 마감되었습니다
        </p>
      )}
    </article>
  );
}

export default function VotePage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) router.push('/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
          안건 투표
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          현재 투표 가능한 안건을 확인하고 의사를 표명하세요.
        </p>
      </div>

      {/* 데스크탑: 3열 그리드 / 모바일: 1열 */}
      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-6">
        {AGENDA_ITEMS.map((item) => (
          <VoteCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
