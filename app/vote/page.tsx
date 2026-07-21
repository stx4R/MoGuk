'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, MinusCircle, Clock, Lock, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';
import DisplayBoard from '@/components/dashboard/DisplayBoard';

type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  is_open: boolean;
  is_completed: boolean;
};

type MyVoteMap = Record<string, 'yes' | 'no' | 'abstain'>;

type VoteResult = {
  agenda_id: string;
  yes_count: number;
  no_count: number;
  abstain_count: number;
  total_voted: number;
  total_users: number;
};

type PublishedMap = Record<string, VoteResult>;

const VOTE_LABEL: Record<string, string> = { yes: '찬성', no: '반대', abstain: '기권' };
const VOTE_PARTICLE: Record<string, string> = { yes: '으로', no: '로', abstain: '으로' };

function statusSub(item: AgendaItem, published: boolean, voted: boolean): string {
  const base = published
    ? '결과 공개됨'
    : item.is_open
      ? '투표 진행 중'
      : item.is_completed
        ? '투표 완료'
        : '투표 중단됨';
  return voted ? `${base} · 참여함` : base;
}

function AgendaListItem({
  item, selected, published, voted, onClick,
}: {
  item: AgendaItem;
  selected: boolean;
  published: boolean;
  voted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        'w-full text-left px-3.5 py-3.5 rounded-xl transition-colors duration-150 flex items-center gap-3',
        selected ? 'bg-[rgba(30,215,96,0.14)]' : 'hover:bg-surface-hover'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate', selected ? 'text-green' : 'text-text-base')}>
          {item.title}
        </p>
        <p className="text-xs mt-0.5 text-text-secondary">{statusSub(item, published, voted)}</p>
      </div>
      <span
        className={cn('w-2 h-2 rounded-full shrink-0', item.is_open ? 'bg-green' : 'bg-[#555]')}
        style={item.is_open ? { boxShadow: '0 0 8px rgba(30,215,96,0.6)', animation: 'pulse-dot 1.6s ease-in-out infinite' } : undefined}
      />
    </button>
  );
}

const CHOICES = [
  { choice: 'yes'     as const, label: '찬성', Icon: CheckCircle2, hoverBorder: 'hover:border-green hover:text-green' },
  { choice: 'no'      as const, label: '반대', Icon: XCircle,      hoverBorder: 'hover:border-negative hover:text-negative' },
  { choice: 'abstain' as const, label: '기권', Icon: MinusCircle,  hoverBorder: 'hover:border-border-light hover:text-text-near-white' },
];

const CHOICE_COLOR: Record<string, string> = { yes: 'var(--yes)', no: 'var(--no)', abstain: 'var(--abstain)' };

function AgendaDetail({
  item, myVote, result, isLoggedIn, onVote,
}: {
  item: AgendaItem;
  myVote: 'yes' | 'no' | 'abstain' | null;
  result: VoteResult | null;
  isLoggedIn: boolean;
  onVote: (choice: 'yes' | 'no' | 'abstain') => Promise<void>;
}) {
  const [voting, setVoting] = useState(false);
  const [pending, setPending] = useState<'yes' | 'no' | 'abstain' | null>(null);

  const requestVote = (choice: 'yes' | 'no' | 'abstain') => {
    if (voting || myVote || !item.is_open || result) return;
    setPending(choice);
  };

  const confirmVote = async () => {
    if (!pending) return;
    setVoting(true);
    await onVote(pending);
    setVoting(false);
    setPending(null);
  };

  return (
    <>
    <div className="flex flex-col h-full p-8 max-md:p-5">
      <div className="mb-5">
        {result ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[rgba(83,157,245,0.15)] text-announcement">
            <BarChart3 size={12} />
            결과 공개됨
          </span>
        ) : item.is_open ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[rgba(30,215,96,0.15)] text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
            투표 진행 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.07)] text-text-secondary">
            <Clock size={11} />
            {item.is_completed ? '투표 마감' : '투표 중단됨'}
          </span>
        )}
      </div>

      <h2 className="text-[24px] max-md:text-[20px] font-extrabold text-text-base mb-3 leading-tight">
        {item.title}
      </h2>
      <div className="w-11 h-1 rounded-full bg-green mb-6" />

      {item.description && (
        <p className="text-sm text-text-near-white leading-[1.75] border-l-2 border-[rgba(30,215,96,0.3)] pl-4 mb-8 whitespace-pre-line">
          {item.description}
        </p>
      )}

      <div className="mt-auto">
        {result ? (
          <DisplayBoard agenda={item} published viewer />
        ) : !isLoggedIn ? (
          <div className="rounded-2xl bg-surface-2 border border-[var(--hairline)] p-8 text-center">
            <Lock size={28} className="mx-auto mb-3 text-[#5a5a5a]" />
            <p className="text-sm font-semibold text-text-secondary">투표하려면 로그인이 필요합니다.</p>
          </div>
        ) : myVote ? (
          <div className="rounded-2xl bg-surface-2 border border-[var(--hairline)] p-8 text-center">
            <div className="w-11 h-11 rounded-full bg-green grid place-items-center mx-auto mb-3.5">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs text-text-secondary mb-1">투표가 완료되었습니다.</p>
            <p className="text-[22px] font-extrabold" style={{ color: CHOICE_COLOR[myVote] }}>
              {VOTE_LABEL[myVote]}
            </p>
          </div>
        ) : !item.is_open ? (
          <div className="rounded-2xl bg-surface-2 border border-[var(--hairline)] p-8 text-center">
            <Clock size={28} className="mx-auto mb-3 text-[#5a5a5a]" />
            <p className="text-sm font-semibold text-text-secondary">
              투표가 마감되었습니다. 결과 공개를 기다려 주세요.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-center text-text-secondary mb-4">
              의사를 선택하세요. 제출 후 변경할 수 없습니다.
            </p>
            <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
              {CHOICES.map(({ choice, label, Icon, hoverBorder }) => (
                <button
                  key={choice}
                  onClick={() => requestVote(choice)}
                  disabled={voting}
                  className={cn(
                    'flex flex-col max-md:flex-row items-center justify-center gap-2.5 py-6 max-md:py-4 rounded-2xl border-[1.5px] font-bold text-[15px] transition-all duration-150',
                    'bg-surface-2 border-transparent text-text-secondary',
                    hoverBorder,
                    'hover:-translate-y-0.5',
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

    {pending && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
        onClick={(e) => { if (e.target === e.currentTarget && !voting) setPending(null); }}
      >
        <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-lg border border-[var(--hairline)] overflow-hidden">
          <div className="px-8 pt-8 pb-3 text-center">
            <p className="text-[18px] text-text-base leading-relaxed break-keep">
              <span className="font-bold">{item.title}</span> 안건에 대해{' '}
              <span className="font-extrabold" style={{ color: CHOICE_COLOR[pending] }}>{VOTE_LABEL[pending]}</span>
              {VOTE_PARTICLE[pending]} 투표하시겠습니까?
            </p>
            <p className="text-[13px] text-text-secondary mt-3">제출 후에는 변경할 수 없습니다.</p>
          </div>
          <div className="flex gap-3 justify-center px-8 pt-2 pb-8">
            <button
              onClick={() => setPending(null)}
              disabled={voting}
              className="min-w-[120px] px-6 py-3 text-[15px] font-semibold rounded-xl border border-[var(--hairline)] text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              아니오
            </button>
            <button
              onClick={confirmVote}
              disabled={voting}
              className="min-w-[120px] px-6 py-3 text-[15px] font-bold rounded-xl bg-green text-black hover:brightness-110 transition-all disabled:opacity-50"
            >
              {voting ? '처리 중...' : '예'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default function VotePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [agendas, setAgendas]       = useState<AgendaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myVotes, setMyVotes]       = useState<MyVoteMap>({});
  const [published, setPublished]   = useState<PublishedMap>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]       = useState(true);
  const agendaChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const resultChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadAgendas = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_items')
      .select('id, title, description, is_open, is_completed')
      .order('display_order');
    if (data) {
      setAgendas(data as AgendaItem[]);
      setSelectedId(prev => {
        if (prev && data.some((a: AgendaItem) => a.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    }
  }, [supabase]);

  const loadPublished = useCallback(async () => {
    const { data } = await supabase
      .from('vote_result_broadcasts')
      .select('agenda_id, yes_count, no_count, abstain_count, total_voted, total_users')
      .order('created_at', { ascending: true });
    if (data) {
      const map: PublishedMap = {};
      (data as VoteResult[]).forEach(r => { map[r.agenda_id] = r; });
      setPublished(map);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.replace('/login?redirectTo=/vote'); return; }

      setIsLoggedIn(true);
      await Promise.all([loadAgendas(), loadPublished()]);

      const { data: votesData } = await supabase
        .from('votes').select('agenda_id, choice').eq('user_id', user.id);
      if (votesData && !cancelled) {
        const map: MyVoteMap = {};
        votesData.forEach((v: { agenda_id: string; choice: string }) => {
          map[v.agenda_id] = v.choice as 'yes' | 'no' | 'abstain';
        });
        setMyVotes(map);
      }
      if (!cancelled) setLoading(false);

      agendaChRef.current = supabase
        .channel('vote-page-agendas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, loadAgendas)
        .subscribe();

      resultChRef.current = supabase
        .channel('vote-page-results')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vote_result_broadcasts' }, (payload) => {
          const r = payload.new as VoteResult;
          setPublished(prev => ({ ...prev, [r.agenda_id]: r }));
        })
        .subscribe();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (agendaChRef.current) supabase.removeChannel(agendaChRef.current);
      if (resultChRef.current) supabase.removeChannel(resultChRef.current);
    };
  }, [router, supabase, loadAgendas, loadPublished]);

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
    <div className="max-w-[var(--maxw)] mx-auto px-6 py-9 max-md:px-4 max-md:py-6">
      <div className="mb-7">
        <h1 className="text-[30px] max-md:text-[24px] font-extrabold text-text-base tracking-[-0.02em]">안건 투표</h1>
        <p className="text-sm text-text-secondary mt-1.5">
          좌측에서 안건을 선택한 후 의사를 표명하세요. 제출 후에는 변경할 수 없습니다.
        </p>
      </div>

      {agendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4 border border-[var(--hairline)]">
            <Lock size={22} className="text-[#5a5a5a]" />
          </div>
          <p className="text-sm font-semibold text-text-secondary">현재 등록된 안건이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[300px_1fr] max-md:grid-cols-1 gap-5 items-start">

          <aside className="max-md:hidden">
            <div className="bg-surface rounded-2xl border border-[var(--hairline)] p-2 space-y-0.5 sticky top-[84px]">
              <p className="text-[11px] font-bold text-[#6f6f6f] uppercase tracking-[0.12em] px-3.5 pt-3 pb-2">
                안건 목록 ({agendas.length})
              </p>
              {agendas.map(item => (
                <AgendaListItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  published={!!published[item.id]}
                  voted={!!myVotes[item.id]}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          </aside>

          <div className="flex flex-col min-w-0">
            <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {agendas.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  aria-selected={item.id === selectedId}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-colors duration-150 whitespace-nowrap',
                    item.id === selectedId
                      ? 'bg-[rgba(30,215,96,0.16)] text-green'
                      : 'bg-surface-2 text-text-secondary'
                  )}
                >
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.is_open ? 'bg-green' : 'bg-[#555]')}
                    style={item.is_open ? { animation: 'pulse-dot 1.6s ease-in-out infinite' } : undefined}
                  />
                  {item.title}
                </button>
              ))}
            </div>

            {selectedAgenda ? (
              <div className="bg-surface rounded-2xl border border-[var(--hairline)] overflow-hidden min-h-[460px] max-md:min-h-0">
                <AgendaDetail
                  item={selectedAgenda}
                  myVote={myVotes[selectedAgenda.id] ?? null}
                  result={published[selectedAgenda.id] ?? null}
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
