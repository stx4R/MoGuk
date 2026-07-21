'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

type BoardAgenda = { id: string; title: string; is_open: boolean; is_completed: boolean };
type Choice = 'yes' | 'no' | 'abstain';
type VoteKey = Choice | 'none';
type Member = { user_id: string; name: string; pp: string; phone: string | null; present: boolean; choice: Choice | null };

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-[rgba(83,157,245,0.15)] text-jinbo',
  '보수':   'bg-[rgba(243,114,127,0.15)] text-negative',
  '중도':   'bg-[rgba(255,255,255,0.08)] text-text-secondary',
  '무소속': 'bg-[rgba(255,255,255,0.06)] text-[#888]',
};

const LED: Record<VoteKey, string> = { yes: '#22e065', no: '#ff3b3b', abstain: '#ffcf3d', none: '#3f3f3f' };
const LED_GLOW: Record<VoteKey, string> = {
  yes:     '0 0 8px rgba(34,224,101,0.8)',
  no:      '0 0 8px rgba(255,59,59,0.8)',
  abstain: '0 0 8px rgba(255,207,61,0.8)',
  none:    'none',
};
const VOTE_LABEL: Record<VoteKey, string> = { yes: '찬성', no: '반대', abstain: '기권', none: '미투표' };
const VOTE_COLOR: Record<VoteKey, string> = { yes: '#2fe86f', no: '#ff5c5c', abstain: '#ffcf3d', none: '#8a8a8a' };

const BOARD_COLS = 8;

export default function DisplayBoard({ agenda, published, onClose, viewer = false }: {
  agenda: BoardAgenda;
  published: boolean;
  onClose?: () => void;
  viewer?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [members, setMembers] = useState<Member[]>([]);
  const [popupId, setPopupId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fetchSeq = useRef(0);

  const loadState = useCallback(async () => {
    const seq = ++fetchSeq.current;
    const rpc = viewer ? 'get_published_board_state' : 'get_board_state';
    const { data } = await supabase.rpc(rpc, { p_agenda_id: agenda.id });
    if (data && seq === fetchSeq.current) setMembers(data as Member[]);
  }, [supabase, agenda.id, viewer]);

  useEffect(() => {
    loadState();
    if (viewer) return;
    const ch = supabase.channel(`board-${agenda.id}`)
      // votes는 서버 필터 없이 구독 — DELETE(미투표 처리) 이벤트는 PK만 담겨
      // agenda_id 필터에 걸리지 않으므로 클라이언트에서 판별해 갱신
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        const rec = (payload.new ?? payload.old) as { agenda_id?: string };
        if (!rec?.agenda_id || rec.agenda_id === agenda.id) loadState();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_attendance', filter: `agenda_id=eq.${agenda.id}` }, loadState)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, agenda.id, loadState, viewer]);

  const patchMember = (id: string, patch: Partial<Member>) =>
    setMembers(ms => ms.map(m => (m.user_id === id ? { ...m, ...patch } : m)));

  const setAttendance = async (m: Member, present: boolean) => {
    patchMember(m.user_id, { present });
    const { data, error } = await supabase.rpc('admin_set_attendance', { p_agenda_id: agenda.id, p_user_id: m.user_id, p_present: present });
    if (error || !data?.success) {
      patchMember(m.user_id, { present: m.present });
      alert(data?.error ?? '출석 처리에 실패했습니다.');
    }
  };

  const overrideVote = async (m: Member, choice: Choice | null) => {
    patchMember(m.user_id, { choice });
    const { data, error } = await supabase.rpc('admin_override_vote', { p_agenda_id: agenda.id, p_user_id: m.user_id, p_choice: choice });
    if (error || !data?.success) {
      patchMember(m.user_id, { choice: m.choice });
      alert(data?.error ?? '투표 결과 변경에 실패했습니다.');
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else overlayRef.current?.requestFullscreen().catch(() => {});
  };

  const handleClose = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose?.();
  };

  const statusLabel = published ? '결과 공개됨' : agenda.is_open ? '투표 진행 중' : agenda.is_completed ? '투표 완료' : '투표 중단됨';
  const statusColor = !published && agenda.is_open ? '#2fe86f' : '#539df5';

  const total = members.length;
  const seated = members.filter(m => m.present).length;
  const countOf = (c: Choice) => members.filter(m => m.present && m.choice === c).length;
  const yesCount = countOf('yes');
  const noCount = countOf('no');
  const abstainCount = countOf('abstain');
  const votedCount = yesCount + noCount + abstainCount;
  const pct = (v: number, base: number) => (base ? Math.round((v / base) * 100) : 0);
  const turnoutPct = pct(votedCount, seated);

  const statBoxes = [
    { label: '재적', value: total,        labelColor: '#e8d44d', valueColor: '#f5f5dc', glow: 'rgba(232,212,77,0.35)' },
    { label: '재석', value: seated,       labelColor: '#e8d44d', valueColor: '#f5f5dc', glow: 'rgba(232,212,77,0.35)' },
    { label: '찬성', value: yesCount,     labelColor: '#2fe86f', valueColor: '#2fe86f', glow: 'rgba(47,232,111,0.45)' },
    { label: '반대', value: noCount,      labelColor: '#ff5c5c', valueColor: '#ff5c5c', glow: 'rgba(255,92,92,0.45)' },
    { label: '기권', value: abstainCount, labelColor: '#ffcf3d', valueColor: '#ffcf3d', glow: 'rgba(255,207,61,0.45)' },
  ];

  const rows = Math.max(1, Math.ceil(total / BOARD_COLS));
  const popupMember = popupId ? members.find(m => m.user_id === popupId) ?? null : null;

  return (
    <div
      ref={viewer ? undefined : overlayRef}
      className={cn(
        'bg-[#040404] flex flex-col overflow-hidden',
        viewer
          ? 'relative w-full rounded-2xl border border-[#232323] h-[560px] max-md:h-[440px]'
          : 'fixed inset-0 z-[200]'
      )}
    >
      {/* 헤더 바 */}
      <div className="shrink-0 flex items-center gap-3.5 px-[22px] py-3.5 bg-[#0a0a0a] border-b-2 border-[#232323]">
        <span
          className="w-2.5 h-2.5 rounded-full animate-[pulse-dot_1.6s_ease-in-out_infinite]"
          style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
        />
        <span className="text-[22px] font-bold text-[#ffe14d] tracking-[0.02em]" style={{ textShadow: '0 0 12px rgba(255,225,77,0.45)' }}>
          {agenda.title}
        </span>
        <span className="text-[13px] font-bold px-3 py-[3px] rounded-[2px] border tracking-[0.1em]" style={{ color: statusColor, borderColor: statusColor }}>
          {statusLabel}
        </span>
        {!viewer && (
          <div className="ml-auto flex gap-2">
            <button
              title="전체화면"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3.5 py-[7px] bg-[#151515] border border-[#333] rounded-[2px] text-[#9a9a9a] text-xs font-bold hover:text-white hover:border-[#666] transition-colors"
            >
              <Maximize size={13} />
              FULL
            </button>
            <button
              title="닫기"
              onClick={handleClose}
              className="flex items-center justify-center w-8 bg-[#151515] border border-[#333] rounded-[2px] text-[#9a9a9a] hover:text-[#ff5c5c] hover:border-[#ff5c5c] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* 집계 바 */}
      <div className="shrink-0 grid grid-cols-5 gap-2.5 px-[22px] py-3 bg-[#060606] border-b-2 border-[#1c1c1c]">
        {statBoxes.map(s => (
          <div key={s.label} className="flex items-baseline justify-center gap-3.5 px-2 py-2.5 bg-[#0c0c0c] border border-[#262626] rounded-[2px]">
            <span className="text-[19px] font-bold" style={{ color: s.labelColor, textShadow: `0 0 10px ${s.glow}` }}>{s.label} :</span>
            <span className="text-[32px] font-bold tabular-nums" style={{ color: s.valueColor, textShadow: `0 0 14px ${s.glow}` }}>{s.value}</span>
            <span className="text-base font-bold" style={{ color: s.labelColor }}>인</span>
          </div>
        ))}
      </div>

      {/* 의원 그리드 + 세로 막대 */}
      <div className="flex-1 flex gap-3.5 px-[22px] pt-3.5 pb-[18px] min-h-0">
        <div
          className="flex-1 min-w-0 grid gap-[5px]"
          style={{
            gridTemplateColumns: `repeat(${BOARD_COLS},minmax(0,1fr))`,
            gridTemplateRows: `repeat(${rows},minmax(0,1fr))`,
          }}
        >
          {members.map(m => {
            const key: VoteKey = m.present && m.choice ? m.choice : 'none';
            const cellClass = cn(
              'flex items-center gap-[7px] px-[9px] min-w-0 bg-[#0d0d0d] border border-[#1f1f1f] rounded-[2px]',
              !viewer && 'hover:border-[#4a4a4a] hover:bg-[#141414] transition-colors'
            );
            const inner = (
              <>
                <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ background: LED[key], boxShadow: LED_GLOW[key] }} />
                <span
                  className="text-sm font-bold tracking-[0.06em] whitespace-nowrap overflow-hidden"
                  style={m.present ? { color: '#35e878', textShadow: '0 0 9px rgba(53,232,120,0.55)' } : { color: '#5c5c5c' }}
                >
                  {m.name}
                </span>
              </>
            );
            return viewer ? (
              <div key={m.user_id} title={m.name} className={cellClass}>{inner}</div>
            ) : (
              <button key={m.user_id} title={m.name} onClick={() => setPopupId(m.user_id)} className={cellClass}>{inner}</button>
            );
          })}
        </div>

        <div className="shrink-0 flex gap-3">
          <div className="flex flex-col items-center gap-2 w-[74px]">
            <span className="text-xs font-bold text-[#9a9a9a] tracking-[0.08em]">투표율</span>
            <div className="flex-1 w-[38px] bg-[#0c0c0c] border border-[#262626] rounded-[2px] relative overflow-hidden">
              <div
                className="absolute bottom-0 inset-x-0 bg-green transition-[height] duration-[600ms]"
                style={{ height: `${turnoutPct}%`, boxShadow: '0 0 16px rgba(30,215,96,0.5)' }}
              />
            </div>
            <span className="text-lg font-bold text-[#2fe86f] tabular-nums" style={{ textShadow: '0 0 10px rgba(47,232,111,0.5)' }}>{turnoutPct}%</span>
          </div>
          <div className="flex flex-col items-center gap-2 w-[74px]">
            <span className="text-xs font-bold text-[#9a9a9a] tracking-[0.08em]">찬반</span>
            <div className="flex-1 w-[38px] bg-[#0c0c0c] border border-[#262626] rounded-[2px] relative overflow-hidden flex flex-col-reverse">
              <div className="shrink-0 bg-green transition-[height] duration-[600ms]" style={{ height: `${pct(yesCount, seated)}%` }} />
              <div className="shrink-0 bg-[#ff3b3b] transition-[height] duration-[600ms]" style={{ height: `${pct(noCount, seated)}%` }} />
              <div className="shrink-0 bg-[#ffcf3d] transition-[height] duration-[600ms]" style={{ height: `${pct(abstainCount, seated)}%` }} />
            </div>
            <div className="flex flex-col gap-0.5 items-center">
              <span className="text-[11px] font-bold text-[#2fe86f]">찬 {yesCount}</span>
              <span className="text-[11px] font-bold text-[#ff5c5c]">반 {noCount}</span>
              <span className="text-[11px] font-bold text-[#ffcf3d]">기 {abstainCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 스캔라인 */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{ background: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0px,rgba(0,0,0,0.22) 1px,transparent 1px,transparent 3px)' }}
      />

      {popupMember && !viewer && (
        <MemberPopup
          member={popupMember}
          onClose={() => setPopupId(null)}
          onToggleAttendance={setAttendance}
          onOverrideVote={overrideVote}
        />
      )}
    </div>
  );
}

function MemberPopup({ member: m, onClose, onToggleAttendance, onOverrideVote }: {
  member: Member;
  onClose: () => void;
  onToggleAttendance: (m: Member, present: boolean) => void;
  onOverrideVote: (m: Member, choice: Choice | null) => void;
}) {
  const ledKey: VoteKey = m.present && m.choice ? m.choice : 'none';
  const voteKey: VoteKey = m.choice ?? 'none';

  return (
    <div
      className="absolute inset-0 z-20 bg-[rgba(0,0,0,0.65)] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[400px] bg-[#0a0a0a] border-2 border-[#2e2e2e] rounded-[3px]" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 24px rgba(30,215,96,0.06)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#222]">
          <span className="w-[11px] h-[11px] rounded-full" style={{ background: LED[ledKey], boxShadow: LED_GLOW[ledKey] }} />
          <span
            className="text-[22px] font-bold tracking-[0.06em]"
            style={m.present ? { color: '#35e878', textShadow: '0 0 9px rgba(53,232,120,0.55)' } : { color: '#5c5c5c' }}
          >
            {m.name}
          </span>
          <span className={cn('text-xs font-bold px-2.5 py-[3px] rounded-[2px]', PP_BADGE[m.pp] ?? PP_BADGE['무소속'])}>{m.pp}</span>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 grid place-items-center border border-[#333] rounded-[2px] text-[#9a9a9a] hover:text-[#ff5c5c] hover:border-[#ff5c5c] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-[18px] flex flex-col gap-3.5">
          <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="text-[#7a7a7a] font-bold">전화번호</span>
            <span className="text-[#dcdcdc] tabular-nums">{m.phone ?? '미등록'}</span>
            <span className="text-[#7a7a7a] font-bold">출석</span>
            <span className="font-bold" style={{ color: m.present ? '#2fe86f' : '#8a8a8a' }}>{m.present ? '출석' : '결석'}</span>
            <span className="text-[#7a7a7a] font-bold">투표 결과</span>
            <span className="font-bold" style={{ color: VOTE_COLOR[voteKey] }}>{VOTE_LABEL[voteKey]}</span>
          </div>
          <button
            onClick={() => onToggleAttendance(m, !m.present)}
            className="w-full py-[11px] rounded-[2px] text-sm font-bold bg-[#131313] border hover:brightness-[1.35] transition-all"
            style={m.present ? { borderColor: '#5c5c5c', color: '#b3b3b3' } : { borderColor: '#1ed760', color: '#2fe86f' }}
          >
            {m.present ? '결석 처리로 변경' : '출석 처리로 변경'}
          </button>
          <div>
            <p className="m-0 mb-2 text-[11px] font-bold text-[#7a7a7a] tracking-[0.1em]">투표 결과 변경 (관리자)</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['yes', 'no', 'abstain', 'none'] as const).map(v => {
                const active = voteKey === v;
                return (
                  <button
                    key={v}
                    onClick={() => onOverrideVote(m, v === 'none' ? null : v)}
                    className="py-2.5 rounded-[2px] text-[13px] font-bold border hover:brightness-[1.3] transition-all"
                    style={active
                      ? { background: 'rgba(255,255,255,0.09)', borderColor: VOTE_COLOR[v], color: VOTE_COLOR[v] }
                      : { background: '#131313', borderColor: '#2a2a2a', color: '#9a9a9a' }}
                  >
                    {VOTE_LABEL[v]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
