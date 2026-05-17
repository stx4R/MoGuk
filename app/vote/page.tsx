// 안건 투표 페이지 — Design B: 좌측 목록 + 우측 상세 2열, 백분율 비공개 S
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, MinusCircle, Clock, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  is_open: boolean;
  is_completed: boolean;
};

type MyVoteMap = Record<string, 'yes' | 'no' | 'abstain'>;

// ── 좌측 목록 아이템 ─────────────────────────────────────────────
function AgendaListItem({
  item,
  selected,
  myVote,
  onClick,
}: {
  item: AgendaItem;
  selected: boolean;
  myVote: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3',
        selected
          ? 'bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 shadow-md'
          : 'hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-300'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-bold truncate',
          selected ? '' : 'text-gray-900 dark:text-gray-100'
        )}>
          {item.title}
        </p>
        <p className={cn(
          'text-xs mt-0.5',
          selected ? 'text-white/70 dark:text-gray-900/70' : 'text-gray-400 dark:text-gray-500'
        )}>
          {item.is_open ? '투표 진행 중' : '대기 중'}
          {myVote && ' · 투표 완료'}
        </p>
      </div>
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0',
        item.is_open
          ? (selected ? 'bg-white dark:bg-gray-900' : 'bg-green-400 animate-pulse')
          : (selected ? 'bg-white/40 dark:bg-gray-900/40' : 'bg-gray-300 dark:bg-gray-600')
      )} />
    </button>
  );
}

// ── 우측 상세 + 투표 UI ────────────────────────────────────────
function AgendaDetail({
  item,
  myVote,
  isLoggedIn,
  onVote,
}: {
  item: AgendaItem;
  myVote: 'yes' | 'no' | 'abstain' | null;
  isLoggedIn: boolean;
  onVote: (choice: 'yes' | 'no' | 'abstain') => Promise<void>;
}) {
  const [voting, setVoting] = useState(false);

  const handleVote = async (choice: 'yes' | 'no' | 'abstain') => {
    if (voting || myVote || !item.is_open) return;
    setVoting(true);
    await onVote(choice);
    setVoting(false);
  };

  const CHOICES = [
    {
      choice: 'yes'     as const, label: '찬성', Icon: CheckCircle2,
      activeClass: 'bg-yellow-primary border-yellow-primary text-white',
      hoverClass: 'hover:border-yellow-primary hover:text-yellow-primary',
    },
    {
      choice: 'no'      as const, label: '반대', Icon: XCircle,
      activeClass: 'bg-red-primary border-red-primary text-white',
      hoverClass: 'hover:border-red-primary hover:text-red-primary',
    },
    {
      choice: 'abstain' as const, label: '기권', Icon: MinusCircle,
      activeClass: 'bg-gray-500 border-gray-500 text-white',
      hoverClass: 'hover:border-gray-400 hover:text-gray-500',
    },
  ];

  const VOTE_LABEL: Record<string, string> = { yes: '찬성', no: '반대', abstain: '기권' };

  return (
    <div className="flex flex-col h-full p-8 max-md:p-5">
      {/* 상태 배지 */}
      <div className="mb-5">
        {item.is_open ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-400/15 text-green-600 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            투표 진행 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-400 dark:text-gray-500">
            <Clock size={11} />
            투표 대기 중
          </span>
        )}
      </div>

      {/* 제목 */}
      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 leading-tight">
        {item.title}
      </h2>
      <div className="w-12 h-1 rounded-full bg-red-primary dark:bg-yellow-primary mb-6" />

      {/* 세부사항 */}
      {item.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-l-2 border-red-primary/30 dark:border-yellow-primary/30 pl-4 mb-8 whitespace-pre-line">
          {item.description}
        </p>
      )}

      {/* 투표 영역 (하단 고정) */}
      <div className="mt-auto">
        {!isLoggedIn ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-8 text-center">
            <Lock size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              투표하려면 로그인이 필요합니다.
            </p>
          </div>
        ) : myVote ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-green-500" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">투표가 완료되었습니다.</p>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">
              {VOTE_LABEL[myVote]}
            </p>
          </div>
        ) : !item.is_open ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-8 text-center">
            <Clock size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
              투표가 아직 시작되지 않았습니다.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-4">
              의사를 선택하세요. 제출 후 변경할 수 없습니다.
            </p>
            <div className="flex gap-3 max-md:flex-col">
              {CHOICES.map(({ choice, label, Icon, activeClass, hoverClass }) => (
                <button
                  key={choice}
                  onClick={() => handleVote(choice)}
                  disabled={voting}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-2.5 py-6 rounded-2xl border-2 font-bold text-sm transition-all duration-200',
                    'border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500',
                    hoverClass,
                    'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
                    voting && 'opacity-50 cursor-not-allowed pointer-events-none'
                  )}
                >
                  <Icon size={26} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────
export default function VotePage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [agendas, setAgendas]     = useState<AgendaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myVotes, setMyVotes]     = useState<MyVoteMap>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]     = useState(true);
  const agendaChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadAgendas = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_items')
      .select('id, title, description, is_open, is_completed')
      .eq('is_completed', false)
      .order('display_order');
    if (data) {
      setAgendas(data as AgendaItem[]);
      setSelectedId(prev => {
        if (prev && data.some((a: AgendaItem) => a.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    }
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'INITIAL_SESSION') return;

      if (!session) {
        router.push('/login');
        return;
      }

      setIsLoggedIn(true);

      await loadAgendas();

      // 내 투표 내역 로드
      const { data: votesData } = await supabase
        .from('votes')
        .select('agenda_id, choice')
        .eq('user_id', session.user.id);

      if (votesData) {
        const map: MyVoteMap = {};
        votesData.forEach((v: { agenda_id: string; choice: string }) => {
          map[v.agenda_id] = v.choice as 'yes' | 'no' | 'abstain';
        });
        setMyVotes(map);
      }

      setLoading(false);

      // 안건 변경 실시간 구독
      agendaChRef.current = supabase
        .channel('vote-page-agendas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, loadAgendas)
        .subscribe();
    });

    return () => {
      subscription.unsubscribe();
      if (agendaChRef.current) supabase.removeChannel(agendaChRef.current);
    };
  }, [router, supabase, loadAgendas]);

  const handleVote = useCallback(async (agendaId: string, choice: 'yes' | 'no' | 'abstain') => {
    const { data } = await supabase.rpc('submit_vote', { p_agenda_id: agendaId, p_choice: choice });
    if (data?.success) {
      setMyVotes(prev => ({ ...prev, [agendaId]: choice }));
    } else {
      alert(data?.error ?? '투표 처리 중 오류가 발생했습니다.');
    }
  }, [supabase]);

  const selectedAgenda = agendas.find(a => a.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
          안건 투표
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          좌측에서 안건을 선택한 후 의사를 표명하세요.
        </p>
      </div>

      {agendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-surface flex items-center justify-center mb-4">
            <Lock size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-base font-semibold text-gray-500 dark:text-gray-400">
            현재 등록된 안건이 없습니다.
          </p>
        </div>
      ) : (
        /* 데스크탑: 좌측 목록 + 우측 상세 / 모바일: 세로 스택 */
        <div className="flex gap-6 max-md:flex-col min-h-[500px]">
          {/* ── 좌측: 안건 목록 ──────────────────────────────────── */}
          <aside className="w-72 shrink-0 max-md:w-full">
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-dark-border p-2 space-y-1 sticky top-24">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 py-2">
                안건 목록 ({agendas.length})
              </p>
              {agendas.map(item => (
                <AgendaListItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  myVote={myVotes[item.id] ?? null}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          </aside>

          {/* ── 우측: 상세 + 투표 ────────────────────────────────── */}
          {selectedAgenda ? (
            <div className="flex-1 bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
              <AgendaDetail
                item={selectedAgenda}
                myVote={myVotes[selectedAgenda.id] ?? null}
                isLoggedIn={isLoggedIn}
                onVote={(choice) => handleVote(selectedAgenda.id, choice)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
