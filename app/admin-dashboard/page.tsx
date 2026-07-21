'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, CheckCircle2, AlertTriangle, X,
  Vote, Eye, BarChart2, Megaphone, Pause, Play, LogOut, Send, Terminal, Presentation,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';
import { useOnlineUsers, type OnlineUser } from '@/components/providers/OnlineUsersContext';
import DisplayBoard from '@/components/dashboard/DisplayBoard';

type AgendaRow    = { id: string; title: string; description: string | null; is_open: boolean; is_completed: boolean; yes_count: number; no_count: number; abstain_count: number; total_count: number };
type ConfirmModal = { title: string; body: string; danger?: boolean; onConfirm: () => Promise<void> };
type MyProfile    = { id: string; name: string; role: string };
type DetailModal  = { agenda: AgendaRow; totalUsers: number };
type CreateAgendaForm = { title: string; description: string };

const ROLE_COLOR: Record<string, string> = { admin: 'text-negative', mod: 'text-warning', user: 'text-green' };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', mod: 'Mod', user: 'User' };

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-[rgba(83,157,245,0.15)] text-jinbo',
  '보수':   'bg-[rgba(243,114,127,0.15)] text-negative',
  '중도':   'bg-[rgba(255,255,255,0.08)] text-text-secondary',
  '무소속': 'bg-[rgba(255,255,255,0.06)] text-[#888]',
};

const ADMIN_COMMANDS = ['/kick', '/ban', '/timeout', '/voteresult'];
const CMD_HINT: Record<string, string> = {
  '/kick':       '/kick "사용자명"',
  '/ban':        '/ban "사용자명"',
  '/timeout':    '/timeout "사용자명" "초"',
  '/voteresult': '/voteresult "투표 제목"',
};

function parseCommand(input: string) {
  const kick       = input.match(/^\/kick\s+"([^"]+)"$/);
  const ban        = input.match(/^\/ban\s+"([^"]+)"$/);
  const timeout    = input.match(/^\/timeout\s+"([^"]+)"\s+"(\d+)"$/);
  const voteresult = input.match(/^\/voteresult\s+"(.+)"$/);
  if (kick)       return { type: 'kick'       as const, name: kick[1] };
  if (ban)        return { type: 'ban'        as const, name: ban[1] };
  if (timeout)    return { type: 'timeout'    as const, name: timeout[1], seconds: Math.min(parseInt(timeout[2]), 86400) };
  if (voteresult) return { type: 'voteresult' as const, title: voteresult[1] };
  return null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { onlineUsers } = useOnlineUsers();

  const [myProfile, setMyProfile]             = useState<MyProfile | null>(null);
  const [agendas, setAgendas]                 = useState<AgendaRow[]>([]);
  const [publishedIds, setPublishedIds]       = useState<Set<string>>(new Set());
  const [totalUsers, setTotalUsers]           = useState(0);
  const [cmdInput, setCmdInput]               = useState('');
  const [showCmds, setShowCmds]               = useState(false);
  const [confirmModal, setConfirmModal]       = useState<ConfirmModal | null>(null);
  const [confirming, setConfirming]           = useState(false);
  const [sending, setSending]                 = useState(false);
  const [detailModal, setDetailModal]         = useState<DetailModal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]           = useState<CreateAgendaForm>({ title: '', description: '' });
  const [creating, setCreating]               = useState(false);
  const [boardAgenda, setBoardAgenda]         = useState<AgendaRow | null>(null);
  const [mobileView, setMobileView] = useState<'main' | 'side'>('main');
  const isAdmin = myProfile?.role === 'admin';
  const [onlineProfiles, setOnlineProfiles] = useState<Map<string, { role: string; name: string; pp: string }>>(new Map());

  useEffect(() => {
    if (!onlineUsers.length) return;
    let active = true;
    supabase.from('profiles').select('id, role, name, pp').in('id', onlineUsers.map((u: OnlineUser) => u.user_id))
      .then(({ data }: { data: { id: string; role: string; name: string; pp: string }[] | null }) => {
        if (active && data) setOnlineProfiles(new Map(data.map((p) => [p.id, { role: p.role, name: p.name, pp: p.pp }])));
      });
    return () => { active = false; };
  }, [onlineUsers, supabase]);

  const adminUsers   = onlineUsers.filter((u: OnlineUser) => onlineProfiles.get(u.user_id)?.role === 'admin');
  const modUsers     = onlineUsers.filter((u: OnlineUser) => onlineProfiles.get(u.user_id)?.role === 'mod');
  const regularUsers = onlineUsers.filter((u: OnlineUser) => {
    const r = onlineProfiles.get(u.user_id)?.role;
    return r === 'user' || r === undefined;
  });
  const onlineCount  = onlineUsers.length;

  const refreshAgendas = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_with_votes')
      .select('id, title, description, is_open, is_completed, yes_count, no_count, abstain_count, total_count')
      .order('display_order');
    if (data) setAgendas(data as AgendaRow[]);
  }, [supabase]);

  const refreshPublished = useCallback(async () => {
    const { data } = await supabase.from('vote_result_broadcasts').select('agenda_id');
    if (data) setPublishedIds(new Set(data.map((r: { agenda_id: string }) => r.agenda_id)));
  }, [supabase]);

  useEffect(() => {
    let agendaCh: ReturnType<typeof supabase.channel>;
    let resultCh: ReturnType<typeof supabase.channel>;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('id, name, role').eq('id', user.id).single();
      if (prof) setMyProfile(prof as MyProfile);

      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setTotalUsers(count ?? 0);

      await refreshAgendas();
      await refreshPublished();

      agendaCh = supabase.channel('admin-agenda-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, refreshAgendas)
        .subscribe();

      resultCh = supabase.channel('admin-result-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vote_result_broadcasts' }, refreshPublished)
        .subscribe();
    }

    init();
    return () => {
      if (agendaCh) supabase.removeChannel(agendaCh);
      if (resultCh) supabase.removeChannel(resultCh);
    };
  }, [supabase, refreshAgendas, refreshPublished]);

  const getUserByName = useCallback(async (name: string) => {
    const { data } = await supabase.from('profiles').select('id, name').eq('name', name).single();
    return data as { id: string; name: string } | null;
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/');
  }, [supabase, router]);

  const handleCreateAgenda = useCallback(async () => {
    if (!createForm.title.trim() || !createForm.description.trim() || !myProfile || creating) return;
    setCreating(true);
    const { data } = await supabase.rpc('admin_create_agenda', { p_title: createForm.title.trim(), p_description: createForm.description.trim() });
    if (!data?.success) {
      alert(data?.error ?? '투표 생성에 실패했습니다.');
    } else {
      await supabase.rpc('admin_toggle_agenda', { p_agenda_id: data.id, p_open: true });
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '' });
    }
    setCreating(false);
  }, [supabase, myProfile, createForm, creating]);

  const toggleAgenda = useCallback((agenda: AgendaRow, open: boolean) => {
    setConfirmModal({
      title: open ? `"${agenda.title}" 투표 열기` : `"${agenda.title}" 투표 중단`,
      body: open ? `투표를 다시 시작하시겠습니까?\n모든 의원이 투표할 수 있게 됩니다.` : `투표를 일시 중단하시겠습니까?\n안건은 투표 페이지에 계속 표시되며, 언제든 다시 열 수 있습니다.`,
      onConfirm: async () => {
        const { data } = await supabase.rpc('admin_toggle_agenda', { p_agenda_id: agenda.id, p_open: open });
        if (data && !data.success) alert(data.error ?? '처리 실패');
      },
    });
  }, [supabase]);

  const completeAgenda = useCallback((agenda: AgendaRow) => {
    setConfirmModal({
      title: `"${agenda.title}" 투표 완료`,
      body: `투표를 완료 처리하시겠습니까?\n투표가 마감되지만 안건은 투표 페이지에 계속 표시됩니다.\n(결과는 '결과 공개' 전까지 비공개로 유지됩니다.)`,
      onConfirm: async () => {
        const { data } = await supabase.rpc('admin_complete_agenda', { p_agenda_id: agenda.id });
        if (data && !data.success) alert(data.error ?? '처리 실패');
      },
    });
  }, [supabase]);

  const publishResult = useCallback((agenda: AgendaRow) => {
    setConfirmModal({
      title: `"${agenda.title}" 결과 공개`,
      body: `투표 결과를 모든 의원에게 공개하시겠습니까?\n공개 후 투표 페이지의 해당 안건 카드에 집계 결과가 표시됩니다.\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        const { data } = await supabase.rpc('admin_publish_result', { p_agenda_id: agenda.id });
        if (!data?.success) { alert(data?.error ?? '결과 공개에 실패했습니다.'); return; }
        setPublishedIds(prev => new Set(prev).add(agenda.id));
      },
    });
  }, [supabase]);

  const openDetailModal = useCallback(async (agenda: AgendaRow) => {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    setDetailModal({ agenda, totalUsers: count ?? 0 });
  }, [supabase]);

  const executeVoteResult = useCallback(async (title: string): Promise<boolean> => {
    if (!myProfile || !isAdmin) return false;
    const { data: agenda } = await supabase.from('agenda_items').select('id').eq('title', title).single();
    if (!agenda) { alert(`"${title}" 투표를 찾을 수 없습니다.`); return false; }
    const { data } = await supabase.rpc('admin_publish_result', { p_agenda_id: agenda.id });
    if (!data?.success) { alert(data?.error ?? '결과 공개에 실패했습니다.'); return false; }
    return true;
  }, [supabase, myProfile, isAdmin]);

  const executeCommand = useCallback(async (input: string) => {
    const cmd = parseCommand(input.trim());
    if (!cmd || !myProfile || !isAdmin) return false;

    if (cmd.type === 'kick' || cmd.type === 'ban') {
      const target = await getUserByName(cmd.name);
      if (!target) { alert(`"${cmd.name}" 유저를 찾을 수 없습니다.`); return false; }
      setConfirmModal({
        title: cmd.type === 'kick' ? `"${target.name}" 강제 로그아웃` : `"${target.name}" 영구 차단`,
        body: cmd.type === 'kick' ? `${target.name} 의원을 강제 로그아웃 처리하시겠습니까?\n세션이 즉시 종료됩니다.` : `${target.name} 의원을 영구 차단하시겠습니까?\n이 작업은 되돌리기 어렵습니다.`,
        danger: true,
        onConfirm: async () => {
          if (cmd.type === 'kick') {
            await supabase.rpc('admin_kick_user', { p_user_id: target.id });
            await fetch('/api/admin/kick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: target.id }) });
            await supabase.channel(`user-control:${target.id}`).send({ type: 'broadcast', event: 'force_signout', payload: { action: 'kick' } });
          } else {
            await supabase.rpc('admin_ban_user', { p_user_id: target.id });
            await supabase.channel(`user-control:${target.id}`).send({ type: 'broadcast', event: 'force_signout', payload: { action: 'ban' } });
          }
        },
      });
      return true;
    }

    if (cmd.type === 'timeout') {
      const target = await getUserByName(cmd.name);
      if (!target) { alert(`"${cmd.name}" 유저를 찾을 수 없습니다.`); return false; }
      const { data: res } = await supabase.rpc('admin_timeout_user', { p_user_id: target.id, p_seconds: cmd.seconds });
      if (res && !res.success) { alert(res.error ?? '타임아웃 실패'); return true; }
      return true;
    }

    if (cmd.type === 'voteresult') {
      await executeVoteResult(cmd.title);
      return true;
    }

    return false;
  }, [supabase, myProfile, isAdmin, getUserByName, executeVoteResult]);

  const handleCommandSubmit = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!cmdInput.trim() || !myProfile || sending || !isAdmin) return;
    setSending(true);
    setShowCmds(false);
    const handled = await executeCommand(cmdInput);
    if (!handled) { alert('올바르지 않은 명령어 형식입니다.'); setSending(false); return; }
    setCmdInput('');
    setSending(false);
  }, [cmdInput, myProfile, sending, isAdmin, executeCommand]);

  const openCount = agendas.filter((a) => a.is_open && !a.is_completed).length;
  const totalVotes = agendas.reduce((s, a) => s + a.total_count, 0);
  const avgParticipation = (agendas.length && totalUsers)
    ? Math.round((agendas.reduce((s, a) => s + a.total_count / totalUsers, 0) / agendas.length) * 100)
    : 0;

  if (!myProfile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    );
  }

  const renderAgendaCard = (a: AgendaRow) => {
    const published = publishedIds.has(a.id);
    const stateLabel = published ? '공개됨' : a.is_open ? '진행 중' : a.is_completed ? '완료' : '중단됨';
    const stateCls = published
      ? 'bg-green text-black'
      : a.is_open
        ? 'bg-[rgba(30,215,96,0.15)] text-green'
        : a.is_completed
          ? 'bg-[rgba(83,157,245,0.15)] text-jinbo'
          : 'bg-[rgba(255,255,255,0.08)] text-text-secondary';
    const t = a.total_count;
    const pct = (v: number) => (t ? Math.round((v / t) * 100) : 0);
    const bars = [
      { label: '찬성', count: a.yes_count,     p: pct(a.yes_count),     color: 'var(--yes)',     textClass: 'text-green' },
      { label: '반대', count: a.no_count,      p: pct(a.no_count),      color: 'var(--no)',      textClass: 'text-negative' },
      { label: '기권', count: a.abstain_count, p: pct(a.abstain_count), color: 'var(--abstain)', textClass: 'text-text-secondary' },
    ];

    return (
      <div key={a.id} className="bg-surface-2 rounded-2xl p-5 mb-3 transition-colors hover:bg-surface-hover">
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
          <span className="font-bold text-[15px] text-text-base flex-1 min-w-[160px]">{a.title}</span>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', stateCls)}>{stateLabel}</span>
          <div className="flex gap-1.5 ml-auto">
            <IconBtn title="전광판" highlight onClick={() => setBoardAgenda(a)}><Presentation size={15} /></IconBtn>
            <IconBtn title="자세히" onClick={() => openDetailModal(a)}><Eye size={15} /></IconBtn>
            {!published && (
              <>
                {!a.is_completed && (
                  a.is_open
                    ? <IconBtn title="중단" onClick={() => toggleAgenda(a, false)}><Pause size={15} /></IconBtn>
                    : <IconBtn title="열기" onClick={() => toggleAgenda(a, true)}><Play size={15} /></IconBtn>
                )}
                {!a.is_completed && (
                  <IconBtn title="완료" onClick={() => completeAgenda(a)}><CheckCircle2 size={15} /></IconBtn>
                )}
                {!a.is_open && (
                  <IconBtn title="결과 공개" highlight onClick={() => publishResult(a)}><Megaphone size={15} /></IconBtn>
                )}
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {bars.map(({ label, count, p, color, textClass }) => (
            <div key={label} className="grid grid-cols-[34px_1fr_70px] items-center gap-2.5 text-xs">
              <span className={cn('font-bold', textClass)}>{label}</span>
              <span className="h-[7px] rounded-full bg-[rgba(255,255,255,0.07)] overflow-hidden">
                <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: color }} />
              </span>
              <span className="text-right text-text-secondary tabular-nums">{count}표 · {p}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-3">
          참여 {t}명 / {totalUsers}명 · {totalUsers ? Math.round((t / totalUsers) * 100) : 0}%
          {published && <span className="text-green font-semibold"> · 결과 공개됨</span>}
        </p>
      </div>
    );
  };

  const agendaMain = (
    <div className="flex-1 overflow-y-auto p-7 max-md:p-4">
      <div className="flex items-center gap-3.5 mb-6">
        <h1 className="text-[26px] max-md:text-[22px] font-extrabold text-text-base tracking-[-0.02em]">투표 관리</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-green text-black text-sm font-bold hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          새 투표
        </button>
      </div>

      <div className="grid grid-cols-3 max-md:grid-cols-2 gap-3 mb-6">
        {[
          { k: '진행 중 안건', v: `${openCount}` },
          { k: '총 투표 수', v: totalVotes, suffix: ' 표' },
          { k: '평균 참여율', v: avgParticipation, suffix: '%' },
        ].map((kpi, i) => (
          <div key={kpi.k} className={cn('bg-surface-2 rounded-2xl px-5 py-4', i === 2 && 'max-md:col-span-2')}>
            <p className="text-xs text-text-secondary font-semibold">{kpi.k}</p>
            <p className="text-[28px] font-extrabold text-text-base mt-1">
              {kpi.v}{kpi.suffix && <small className="text-sm text-text-secondary font-semibold">{kpi.suffix}</small>}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[13px] font-bold text-text-base uppercase tracking-[0.08em] mb-3.5">안건 목록</p>
      {agendas.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-10">등록된 안건이 없습니다. 새 투표를 생성하세요.</p>
      ) : (
        agendas.map(renderAgendaCard)
      )}
    </div>
  );

  const usersHeader = (
    <div className="px-3.5 py-3 flex items-center gap-2 border-b border-[var(--hairline)] shrink-0">
      <Users size={14} className="text-green" />
      <span className="text-[13px] font-bold text-text-base">접속자</span>
      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(30,215,96,0.15)] text-green font-semibold">{onlineCount}명</span>
    </div>
  );

  const usersList = (
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      {onlineUsers.length === 0 ? (
        <p className="text-xs text-text-secondary text-center py-6">접속자 없음</p>
      ) : (
        ([['admin', 'Admin', adminUsers, 'text-negative', 'bg-negative'],
          ['mod', 'Mod', modUsers, 'text-warning', 'bg-warning'],
          ['user', 'User', regularUsers, 'text-green', 'bg-green']] as const)
          .filter(([, , list]) => list.length > 0)
          .map(([key, label, list, txt, dot]) => (
            <div key={key} className="mt-3">
              <p className={cn('text-[11px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-1', txt)}>{label} · {list.length}</p>
              {list.map((u) => {
                const p = onlineProfiles.get(u.user_id);
                const nm = p?.name ?? '—';
                const pp = p?.pp ?? '무소속';
                return (
                  <div key={u.user_id} className="flex items-center gap-2.5 px-1.5 py-2 rounded-lg hover:bg-surface-2 transition-colors">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                    <span className="flex-1 text-[13px] text-text-near-white truncate">{nm}</span>
                    <span className={cn('text-[10px] font-extrabold px-1.5 py-0.5 rounded-full', PP_BADGE[pp] ?? PP_BADGE['무소속'])}>{pp}</span>
                  </div>
                );
              })}
            </div>
          ))
      )}
    </div>
  );

  const commandBox = (
    <div className="shrink-0 border-t border-[var(--hairline)]">
      {showCmds && (
        <div className="mx-3 mt-2 border border-[var(--hairline)] rounded-xl overflow-hidden bg-surface-card shadow-[var(--shadow-heavy)]">
          {ADMIN_COMMANDS.filter((c) => c.startsWith(cmdInput)).map((cmd) => (
            <button key={cmd} onMouseDown={() => { setCmdInput(CMD_HINT[cmd] + ' '); setShowCmds(false); }}
              className="w-full text-left px-4 py-2.5 text-sm font-mono text-green hover:bg-surface-2 transition-colors border-b last:border-0 border-[var(--hairline)]">
              <span className="font-bold">{cmd}</span>
              <span className="text-[#666] ml-2 text-xs">{CMD_HINT[cmd].slice(cmd.length)}</span>
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleCommandSubmit} className="p-2.5 flex gap-2 shrink-0 items-center">
        <span className="p-2.5 text-text-secondary shrink-0"><Terminal size={15} /></span>
        <input
          value={cmdInput}
          onChange={(e) => { setCmdInput(e.target.value); setShowCmds(e.target.value.startsWith('/')); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setShowCmds(false); return; }
            if (e.key === 'Tab') {
              const matches = ADMIN_COMMANDS.filter(c => c.startsWith(cmdInput));
              if (matches.length > 0) { e.preventDefault(); setCmdInput(CMD_HINT[matches[0]] + ' '); setShowCmds(false); }
            }
          }}
          placeholder='/kick "사용자명" 등 관리자 명령어'
          maxLength={200}
          className="flex-1 px-4 py-2.5 rounded-full bg-surface-2 text-[13px] text-text-base outline-none focus:shadow-[#fff_0_0_0_1px_inset] transition-all font-mono"
        />
        <button type="submit" disabled={!cmdInput.trim() || sending}
          className="w-10 h-10 rounded-full bg-green text-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 shrink-0">
          <Send size={15} />
        </button>
      </form>
    </div>
  );

  const railItem = (active: boolean, icon: React.ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick}
      className={cn('flex items-center gap-3.5 w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
        active ? 'text-text-base bg-surface-2' : 'text-text-secondary hover:text-text-base')}>
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );

  const rail = (
    <aside className="w-[230px] shrink-0 bg-surface rounded-xl flex flex-col p-3.5 gap-1.5 max-md:hidden">
      {isAdmin && railItem(mobileView === 'main', <BarChart2 size={18} />, '투표 관리', () => setMobileView('main'))}
      {railItem(!isAdmin || mobileView === 'side', <Users size={18} />, '접속자', () => setMobileView('side'))}
      <div className="flex-1" />
      {railItem(false, <LogOut size={18} />, '로그아웃', handleLogout)}
      <div className="flex items-center gap-2.5 px-2 py-2.5 border-t border-[var(--hairline)] mt-1">
        <span className="w-9 h-9 rounded-full grid place-items-center text-black font-extrabold text-sm shrink-0" style={{ background: 'linear-gradient(135deg,#34e979,#14b84e)' }}>
          {myProfile.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text-base truncate">{myProfile.name}</p>
          <p className={cn('text-[11px] font-bold', ROLE_COLOR[myProfile.role] ?? 'text-green')}>{ROLE_LABEL[myProfile.role] ?? myProfile.role}</p>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {isAdmin && boardAgenda && (
        <DisplayBoard
          agenda={agendas.find((x) => x.id === boardAgenda.id) ?? boardAgenda}
          published={publishedIds.has(boardAgenda.id)}
          onClose={() => setBoardAgenda(null)}
        />
      )}

      {detailModal && (() => {
        const a = detailModal.agenda;
        const totalVoted = a.total_count || 1;
        const tUsers = detailModal.totalUsers || 1;
        const participationPct = Math.round((a.total_count / tUsers) * 100);
        const yesPct     = Math.round((a.yes_count     / totalVoted) * 100);
        const noPct      = Math.round((a.no_count      / totalVoted) * 100);
        const abstainPct = Math.max(0, 100 - yesPct - noPct);
        const bars = [
          { label: '찬성', count: a.yes_count,     pct: yesPct,     barColor: 'var(--yes)',     textClass: 'text-green' },
          { label: '반대', count: a.no_count,      pct: noPct,      barColor: 'var(--no)',      textClass: 'text-negative' },
          { label: '기권', count: a.abstain_count, pct: abstainPct, barColor: 'var(--abstain)', textClass: 'text-text-secondary' },
        ];
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5" onClick={(e) => { if (e.target === e.currentTarget) setDetailModal(null); }}>
            <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-md overflow-hidden border border-[var(--hairline)]">
              <div className="bg-green px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-black/60 uppercase tracking-wider mb-0.5">
                    {publishedIds.has(a.id) ? '결과 공개됨' : a.is_completed ? '투표 완료' : a.is_open ? '투표 진행 중' : '투표 중단됨'}
                  </p>
                  <h2 className="text-base font-extrabold text-black leading-tight">{a.title}</h2>
                </div>
                <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg text-black/60 hover:bg-black/10 transition-colors"><X size={17} /></button>
              </div>
              <div className="p-6 space-y-4">
                {a.description && (
                  <p className="text-xs text-text-secondary leading-relaxed border-l-2 border-green pl-3 whitespace-pre-line">{a.description}</p>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-text-base">전체 참여율</span>
                    <span className="text-text-secondary">{a.total_count}명 / {detailModal.totalUsers}명 ({participationPct}%)</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-text-secondary transition-all duration-700" style={{ width: `${participationPct}%` }} />
                  </div>
                </div>
                {bars.map(({ label, count, pct, barColor, textClass }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={cn('font-bold', textClass)}>{label}</span>
                      <span className="text-text-secondary">{count}명 ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {showCreateModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-md border border-[var(--hairline)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--hairline)]">
              <Vote size={15} className="text-green" />
              <span className="font-bold text-text-base flex-1 text-sm">새 투표 생성</span>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-text-secondary hover:text-text-base hover:bg-surface-hover transition-colors"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">투표 제목 <span className="text-negative">*</span></label>
                <input value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} maxLength={100}
                  placeholder="예: 제 6호 안건"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 text-sm text-text-base outline-none focus:shadow-[var(--green)_0_0_0_1px_inset] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">세부사항 <span className="text-negative">*</span></label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} maxLength={2000} rows={5}
                  placeholder="투표할 사항에 대한 세부 내용을 입력하세요."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 text-sm text-text-base outline-none focus:shadow-[var(--green)_0_0_0_1px_inset] transition-all resize-none" />
              </div>
              <p className="text-[11px] text-text-secondary">생성 시 투표가 즉시 시작되어 모든 의원이 바로 투표할 수 있습니다.</p>
            </div>
            <div className="flex gap-2 justify-end px-5 pb-5">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--hairline)] text-text-secondary hover:bg-surface-hover transition-colors">취소</button>
              <button disabled={!createForm.title.trim() || !createForm.description.trim() || creating} onClick={handleCreateAgenda}
                className="px-4 py-2 text-sm rounded-lg bg-green text-black font-semibold hover:brightness-110 transition-all disabled:opacity-40">
                {creating ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-sm border border-[var(--hairline)] overflow-hidden">
            <div className="flex items-start gap-3 p-6">
              <AlertTriangle className="text-warning mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-bold text-text-base text-sm">{confirmModal.title}</p>
                <p className="text-sm text-text-secondary mt-1 whitespace-pre-line leading-relaxed">{confirmModal.body}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-6">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--hairline)] text-text-secondary hover:bg-surface-hover transition-colors">취소</button>
              <button disabled={confirming}
                onClick={async () => { setConfirming(true); await confirmModal.onConfirm(); setConfirming(false); setConfirmModal(null); }}
                className={cn('px-4 py-2 text-sm rounded-lg font-semibold transition-all disabled:opacity-50', confirmModal.danger ? 'bg-negative text-white hover:brightness-110' : 'bg-green text-black hover:brightness-110')}>
                {confirming ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn('h-[calc(100vh-4rem)] flex gap-2 p-2 bg-black overflow-hidden max-md:h-auto max-md:min-h-[calc(100vh-4rem)] max-md:flex-col max-md:gap-0 max-md:p-0', isAdmin && 'max-md:pb-16')}>
        {rail}

        <main className={cn('flex-1 min-w-0 bg-surface rounded-xl flex flex-col overflow-hidden max-md:rounded-none', isAdmin && mobileView === 'side' && 'max-md:hidden')}>
          {isAdmin ? agendaMain : (
            <>
              {usersHeader}
              {usersList}
            </>
          )}
        </main>

        {isAdmin && (
          <aside className={cn('w-[340px] shrink-0 bg-surface rounded-xl flex flex-col overflow-hidden max-md:w-full max-md:rounded-none', mobileView === 'main' && 'max-md:hidden')}>
            {usersHeader}
            {usersList}
            {commandBox}
          </aside>
        )}
      </div>

      {isAdmin && (
        <nav className="hidden max-md:flex fixed bottom-0 inset-x-0 z-[60] bg-[rgba(18,18,18,0.95)] backdrop-blur-[12px] border-t border-[var(--hairline)]">
          {([['main', '투표 관리', <BarChart2 key="a" size={20} />],
             ['side', '접속자', <Users key="b" size={20} />]] as const).map(([view, label, icon]) => (
            <button key={view} onClick={() => setMobileView(view as 'main' | 'side')}
              className={cn('flex-1 py-2.5 flex flex-col items-center gap-1 text-[11px] font-bold transition-colors', mobileView === view ? 'text-green' : 'text-text-secondary')}>
              {icon}
              {label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

function IconBtn({ children, title, onClick, highlight }: { children: React.ReactNode; title: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'w-8 h-8 rounded-full grid place-items-center transition-colors',
        highlight
          ? 'text-green bg-[rgba(30,215,96,0.12)] hover:bg-[rgba(30,215,96,0.22)]'
          : 'text-text-secondary hover:text-text-base hover:bg-[rgba(255,255,255,0.08)]'
      )}
    >
      {children}
    </button>
  );
}
