// 안건 투표 페이지 — Spotify 2열 레이아웃 (좌측 목록 + 우측 상세) S
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

// ── 좌측 목록 아이템 ────────────────────────────────────────────
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
          ? 'bg-surface-hover text-text-base'
          : 'hover:bg-surface-hover text-text-secondary hover:text-text-base'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate text-text-base">{item.title}</p>
        <p className="text-xs mt-0.5 text-text-secondary">
          {item.is_open ? '투표 진행 중' : '대기 중'}
          {myVote && ' · 투표 완료'}
        </p>
      </div>
      <span
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          item.is_open ? 'bg-green' : 'bg-border'
        )}
        style={item.is_open ? { animation: 'pulse-dot 1.6s ease-in-out infinite' } : undefined}
      />
    </button>
  );
}

// ── 우측 상세 + 투표 UI ─────────────────────────────────────────
const CHOICES = [
  {
    choice: 'yes'     as const, label: '찬성', Icon: CheckCircle2,
    color: 'var(--yes)',
    selectedBg: 'bg-[rgba(30,215,96,0.15)]', selectedBorder: 'border-green', selectedText: 'text-green',
    hoverBorder: 'hover:border-green hover:text-green',
  },
  {
    choice: 'no'      as const, label: '반대', Icon: XCircle,
    color: 'var(--no)',
    selectedBg: 'bg-[rgba(243,114,127,0.15)]', selectedBorder: 'border-negative', selectedText: 'text-negative',
    hoverBorder: 'hover:border-negative hover:text-negative',
  },
  {
    choice: 'abstain' as const, label: '기권', Icon: MinusCircle,
    color: 'var(--abstain)',
    selectedBg: 'bg-[rgba(255,255,255,0.08)]', selectedBorder: 'border-border-light', selectedText: 'text-text-secondary',
    hoverBorder: 'hover:border-border-light hover:text-text-secondary',
  },
];

const VOTE_LABEL: Record<string, string> = { yes: '찬성', no: '반대', abstain: '기권' };

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

  const doneChoice = myVote ? CHOICES.find(c => c.choice === myVote) : null;

  return (
    <div className="flex flex-col h-full p-8 max-md:p-5">
      {/* 상태 배지 */}
      <div className="mb-5">
        {item.is_open ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[rgba(30,215,96,0.15)] text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
            투표 진행 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.08)] text-text-secondary">
            <Clock size={11} />
            투표 대기 중
          </span>
        )}
      </div>

      {/* 제목 */}
      <h2 className="text-[22px] font-extrabold text-text-base mb-2 leading-tight">
        {item.title}
      </h2>
      <div className="w-12 h-1 rounded-full bg-green mb-6" />

      {/* 설명 */}
      {item.description && (
        <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-green pl-4 mb-8 whitespace-pre-line">
          {item.description}
        </p>
      )}

      {/* 투표 영역 */}
      <div className="mt-auto">
        {!isLoggedIn ? (
          <div className="rounded-2xl bg-surface border border-[var(--hairline)] p-8 text-center">
            <Lock size={28} className="mx-auto mb-3 text-border" />
            <p className="text-sm font-semibold text-text-secondary">
              투표하려면 로그인이 필요합니다.
            </p>
          </div>
        ) : myVote && doneChoice ? (
          <div className="rounded-2xl bg-surface border border-[var(--hairline)] p-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: `${doneChoice.color}22` }}
            >
              <doneChoice.Icon size={24} style={{ color: doneChoice.color }} />
            </div>
            <p className="text-xs text-text-secondary mb-1">투표가 완료되었습니다.</p>
            <p className="text-xl font-extrabold" style={{ color: doneChoice.color }}>
              {VOTE_LABEL[myVote]}
            </p>
          </div>
        ) : !item.is_open ? (
          <div className="rounded-2xl bg-surface border border-[var(--hairline)] p-8 text-center">
            <Clock size={28} className="mx-auto mb-3 text-border" />
            <p className="text-sm font-semibold text-text-secondary">
              투표가 아직 시작되지 않았습니다.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-center text-text-secondary mb-4">
              의사를 선택하세요. 제출 후 변경할 수 없습니다.
            </p>
            <div className="flex gap-3 max-md:flex-col">
              {CHOICES.map(({ choice, label, Icon, selectedBg, selectedBorder, selectedText, hoverBorder }) => (
                <button
                  key={choice}
                  onClick={() => handleVote(choice)}
                  disabled={voting}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-2.5 py-7 rounded-2xl border-2 font-bold text-sm transition-all duration-200',
                    'border-border text-text-secondary',
                    hoverBorder,
                    'hover:-translate-y-1 hover:shadow-[var(--shadow-medium)]',
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

// ── 메인 페이지 ────────────────────────────────────────────────
export default function VotePage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [agendas, setAgendas]       = useState<AgendaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myVotes, setMyVotes]       = useState<MyVoteMap>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]       = useState(true);
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
    let initialized = false;

    const initPage = async (session: { user: { id: string } }) => {
      if (initialized) return;
      initialized = true;
      setIsLoggedIn(true);
      await loadAgendas();
      const { data: votesData } = await supabase
        .from('votes').select('agenda_id, choice').eq('user_id', session.user.id);
      if (votesData) {
        const map: MyVoteMap = {};
        votesData.forEach((v: { agenda_id: string; choice: string }) => {
          map[v.agenda_id] = v.choice as 'yes' | 'no' | 'abstain';
        });
        setMyVotes(map);
      }
      setLoading(false);
      agendaChRef.current = supabase
        .channel('vote-page-agendas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, loadAgendas)
        .subscribe();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { router.push('/login'); return; }
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
      if (!session) { if (event === 'INITIAL_SESSION') router.push('/login'); return; }
      await initPage(session);
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
        <div className="w-5 h-5 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[var(--maxw)] mx-auto px-6 py-10">
      <div className="mb-7">
        <h1 className="text-[24px] font-extrabold text-text-base tracking-[-0.02em]">안건 투표</h1>
        <p className="text-sm text-text-secondary mt-1">안건을 선택한 후 의사를 표명하세요.</p>
      </div>

      {agendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4 border border-[var(--hairline)]">
            <Lock size={22} className="text-border" />
          </div>
          <p className="text-sm font-semibold text-text-secondary">현재 등록된 안건이 없습니다.</p>
        </div>
      ) : (
        <div className="flex gap-5 min-h-[500px]">

          {/* ── 좌측: 안건 목록 (데스크탑) ──────────────────────── */}
          <aside className="hidden md:block w-[300px] shrink-0">
            <div className="bg-surface rounded-xl border border-[var(--hairline)] p-2 space-y-0.5 sticky top-[80px]">
              <p className="text-[10px] font-bold text-[#6f6f6f] uppercase tracking-widest px-4 py-2">
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

          {/* ── 상단: 칩 스크롤러 (모바일) ──────────────────────── */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {agendas.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150',
                    item.id === selectedId
                      ? 'bg-text-base text-bg-base'
                      : 'bg-surface-2 text-text-secondary hover:bg-surface-hover hover:text-text-base'
                  )}
                >
                  {item.is_open && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
                  )}
                  {item.title}
                </button>
              ))}
            </div>

            {/* ── 상세 패널 ─────────────────────────────────────── */}
            {selectedAgenda ? (
              <div className="flex-1 bg-surface rounded-xl border border-[var(--hairline)] overflow-hidden">
                <AgendaDetail
                  item={selectedAgenda}
                  myVote={myVotes[selectedAgenda.id] ?? null}
                  isLoggedIn={isLoggedIn}
                  onVote={(choice) => handleVote(selectedAgenda.id, choice)}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
