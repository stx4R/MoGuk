'use client';

// Admin/Mod 대시보드 — 3열 레이아웃(네비 레일 · 투표 관리 · 접속자/채팅) S
// Admin: 풀기능(투표 관리 + 결과 공개 + 명령어 + 버그제보) / Mod: 접속자 + 스태프 채팅 + 호출 참가
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, Send, Plus, CheckCircle2, AlertTriangle, Bell, Bug, X,
  Vote, Eye, BarChart2, MessageSquare, Megaphone, Pause, Play, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';
import { useOnlineUsers, type OnlineUser } from '@/components/providers/OnlineUsersContext';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import FileDisplay from '@/components/chat/FileDisplay';

// ── Types ───────────────────────────────────────────────────────────
type ChatMsg      = { id: string; content: string; is_command: boolean; created_at: string; profile_name: string; profile_role: string; file_url: string | null; file_name: string | null };
type AgendaRow    = { id: string; title: string; description: string | null; is_open: boolean; is_completed: boolean; yes_count: number; no_count: number; abstain_count: number; total_count: number };
type ConfirmModal = { title: string; body: string; danger?: boolean; onConfirm: () => Promise<void> };
type MyProfile    = { id: string; name: string; role: string };
type AdminCall    = { id: string; caller_id: string; caller_name: string; created_at: string };
type BugReport    = { id: string; reporter_name: string; title: string; description: string; category: string; created_at: string; resolved: boolean };
type DetailModal  = { agenda: AgendaRow; totalUsers: number };
type CreateAgendaForm = { title: string; description: string };
type RightTab     = 'users' | 'chat';

const ROLE_COLOR: Record<string, string> = { admin: 'text-negative', mod: 'text-warning', user: 'text-green' };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', mod: 'Mod', user: 'User' };

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-[rgba(83,157,245,0.15)] text-jinbo',
  '보수':   'bg-[rgba(243,114,127,0.15)] text-negative',
  '중도':   'bg-[rgba(255,255,255,0.08)] text-text-secondary',
  '무소속': 'bg-[rgba(255,255,255,0.06)] text-[#888]',
};

const ADMIN_COMMANDS = ['/kick', '/ban', '/timeout', '/announcement', '/voteresult'];
const CMD_HINT: Record<string, string> = {
  '/kick':         '/kick "사용자명"',
  '/ban':          '/ban "사용자명"',
  '/timeout':      '/timeout "사용자명" "초"',
  '/announcement': '/announcement "내용"',
  '/voteresult':   '/voteresult "투표 제목"',
};

function parseCommand(input: string) {
  const kick       = input.match(/^\/kick\s+"([^"]+)"$/);
  const ban        = input.match(/^\/ban\s+"([^"]+)"$/);
  const timeout    = input.match(/^\/timeout\s+"([^"]+)"\s+"(\d+)"$/);
  const ann        = input.match(/^\/announcement\s+"(.+)"$/);
  const voteresult = input.match(/^\/voteresult\s+"(.+)"$/);
  if (kick)       return { type: 'kick'         as const, name: kick[1] };
  if (ban)        return { type: 'ban'          as const, name: ban[1] };
  if (timeout)    return { type: 'timeout'      as const, name: timeout[1], seconds: Math.min(parseInt(timeout[2]), 86400) };
  if (ann)        return { type: 'announcement' as const, content: ann[1] };
  if (voteresult) return { type: 'voteresult'   as const, title: voteresult[1] };
  return null;
}

const fmt = (ts: string) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

async function checkMagicBytes(file: File): Promise<boolean> {
  const buf  = await file.slice(0, 12).arrayBuffer();
  const b    = new Uint8Array(buf);
  const type = file.type;
  if (type === 'image/jpeg')      return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  if (type === 'image/png')       return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  if (type === 'image/gif')       return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  if (type === 'image/webp')      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  if (type === 'image/avif')      return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
  if (type === 'application/pdf') return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  if (type === 'text/plain') {
    const isMZ      = b[0] === 0x4D && b[1] === 0x5A;
    const isELF     = b[0] === 0x7F && b[1] === 0x45 && b[2] === 0x4C && b[3] === 0x46;
    const isShebang = b[0] === 0x23 && b[1] === 0x21;
    return !isMZ && !isELF && !isShebang;
  }
  return false;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { onlineUsers } = useOnlineUsers();
  const { setPipRoomId } = usePIPChat();

  const [myProfile, setMyProfile]             = useState<MyProfile | null>(null);
  const [messages, setMessages]               = useState<ChatMsg[]>([]);
  const [agendas, setAgendas]                 = useState<AgendaRow[]>([]);
  const [publishedIds, setPublishedIds]       = useState<Set<string>>(new Set());
  const [totalUsers, setTotalUsers]           = useState(0);
  const [pendingCalls, setPendingCalls]       = useState<AdminCall[]>([]);
  const [bugReports, setBugReports]           = useState<BugReport[]>([]);
  const [allBugReports, setAllBugReports]     = useState<BugReport[]>([]);
  const [showBugModal, setShowBugModal]       = useState(false);
  const [bugModalLoading, setBugModalLoading] = useState(false);
  const [chatInput, setChatInput]             = useState('');
  const [showCmds, setShowCmds]               = useState(false);
  const [confirmModal, setConfirmModal]       = useState<ConfirmModal | null>(null);
  const [confirming, setConfirming]           = useState(false);
  const [sending, setSending]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [isDragging, setIsDragging]           = useState(false);
  const [detailModal, setDetailModal]         = useState<DetailModal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]           = useState<CreateAgendaForm>({ title: '', description: '' });
  const [creating, setCreating]               = useState(false);

  const [rightTab, setRightTab]   = useState<RightTab>('users');
  const [mobileView, setMobileView] = useState<'main' | 'side'>('main');

  const msgPanelRef   = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const chatInputRef  = useRef<HTMLInputElement>(null);

  const isAdmin = myProfile?.role === 'admin';
  const isMod   = myProfile?.role === 'mod';

  const [onlineRoles, setOnlineRoles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!onlineUsers.length) { setOnlineRoles(new Map()); return; }
    supabase.from('profiles').select('id, role').in('id', onlineUsers.map((u: OnlineUser) => u.user_id))
      .then(({ data }: { data: { id: string; role: string }[] | null }) => {
        if (data) setOnlineRoles(new Map(data.map((p: { id: string; role: string }) => [p.id, p.role])));
      });
  }, [onlineUsers, supabase]);

  const adminUsers   = onlineUsers.filter((u: OnlineUser) => onlineRoles.get(u.user_id) === 'admin');
  const modUsers     = onlineUsers.filter((u: OnlineUser) => onlineRoles.get(u.user_id) === 'mod');
  const regularUsers = onlineUsers.filter((u: OnlineUser) => onlineRoles.get(u.user_id) === 'user' || !onlineRoles.has(u.user_id));
  const onlineCount  = onlineUsers.length;

  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = msgPanelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleMsgScroll = useCallback(() => {
    const el = msgPanelRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

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

  // ── 초기 로드 + 실시간 구독 ─────────────────────────────────────
  useEffect(() => {
    let chatCh:   ReturnType<typeof supabase.channel>;
    let callCh:   ReturnType<typeof supabase.channel>;
    let agendaCh: ReturnType<typeof supabase.channel>;
    let resultCh: ReturnType<typeof supabase.channel>;
    let bugCh:    ReturnType<typeof supabase.channel> | undefined;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('id, name, role').eq('id', user.id).single();
      if (prof) {
        setMyProfile(prof as MyProfile);
        setRightTab((prof as MyProfile).role === 'admin' ? 'users' : 'users');
      }

      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setTotalUsers(count ?? 0);

      const { data: chatInit } = await supabase
        .from('admin_chat')
        .select('id, content, is_command, created_at, file_url, file_name, profiles!author_id(name, role)')
        .order('created_at', { ascending: true }).limit(100);
      if (chatInit) {
        setMessages(chatInit.map((m: any) => ({ ...m, profile_name: m.profiles?.name ?? '알 수 없음', profile_role: m.profiles?.role ?? 'user', file_url: m.file_url ?? null, file_name: m.file_name ?? null })));
      }

      const { data: callsInit } = await supabase
        .from('admin_calls')
        .select('id, caller_id, created_at, profiles!caller_id(name)')
        .eq('status', 'pending').order('created_at');
      if (callsInit) {
        setPendingCalls(callsInit.map((c: any) => ({ ...c, caller_name: c.profiles?.name ?? '알 수 없음' })));
      }

      await refreshAgendas();
      await refreshPublished();

      if (prof?.role === 'admin') {
        const { data: bugsInit } = await supabase
          .from('bug_reports')
          .select('id, title, description, category, created_at, resolved, profiles!reporter_id(name)')
          .order('created_at', { ascending: false }).limit(10);
        if (bugsInit) {
          setBugReports(bugsInit.map((b: any) => ({ ...b, reporter_name: b.profiles?.name ?? (b.reporter_id ? '알 수 없음' : 'Guest'), resolved: b.resolved ?? false })));
        }

        bugCh = supabase.channel('bug-report-stream')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bug_reports' }, async (payload: { new: any }) => {
            const row = payload.new;
            const reporterName = row.reporter_id
              ? ((await supabase.from('profiles').select('name').eq('id', row.reporter_id).single()).data?.name ?? '알 수 없음')
              : 'Guest';
            setBugReports((prev: BugReport[]) => [{ ...row, reporter_name: reporterName, resolved: false }, ...prev].slice(0, 10));
          }).subscribe();
      }

      chatCh = supabase.channel('admin-chat-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat' }, async (payload: { new: any }) => {
          const row = payload.new;
          const { data: p } = await supabase.from('profiles').select('name, role').eq('id', row.author_id).single();
          setMessages((prev: ChatMsg[]) => [...prev, { ...row, profile_name: p?.name ?? '알 수 없음', profile_role: p?.role ?? 'user', file_url: row.file_url ?? null, file_name: row.file_name ?? null }]);
        }).subscribe();

      callCh = supabase.channel('admin-call-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_calls' }, async (payload: { new: any }) => {
          const row = payload.new;
          if (row.status !== 'pending') return;
          const { data: p } = await supabase.from('profiles').select('name').eq('id', row.caller_id).single();
          setPendingCalls((prev: AdminCall[]) => [...prev, { ...row, caller_name: p?.name ?? '알 수 없음' }]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_calls' }, (payload: { new: any }) => {
          const row = payload.new;
          if (row.status !== 'pending') setPendingCalls((prev: AdminCall[]) => prev.filter((c: AdminCall) => c.id !== row.id));
        }).subscribe();

      agendaCh = supabase.channel('admin-agenda-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, refreshAgendas)
        .subscribe();

      resultCh = supabase.channel('admin-result-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vote_result_broadcasts' }, refreshPublished)
        .subscribe();
    }

    init();
    return () => {
      if (chatCh)   supabase.removeChannel(chatCh);
      if (callCh)   supabase.removeChannel(callCh);
      if (agendaCh) supabase.removeChannel(agendaCh);
      if (resultCh) supabase.removeChannel(resultCh);
      if (bugCh)    supabase.removeChannel(bugCh);
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

  const handleJoinCall = useCallback(async (call: AdminCall) => {
    if (!myProfile) return;
    const { data } = await supabase.from('admin_calls').update({ status: 'active', responder_id: myProfile.id }).eq('id', call.id).eq('status', 'pending').select().maybeSingle();
    if (!data) return;
    const { data: room } = await supabase.from('chat_rooms').insert({ name: `${call.caller_name} 지원`, is_support: true, created_by: myProfile.id }).select('id').single();
    if (!room) return;
    await supabase.from('chat_room_members').insert([{ room_id: room.id, user_id: myProfile.id }, { room_id: room.id, user_id: call.caller_id }]);
    await new Promise<void>(resolve => {
      const sigCh = supabase.channel(`support-signal:${call.caller_id}`);
      sigCh.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await sigCh.send({ type: 'broadcast', event: 'support_ready', payload: { room_id: room.id } });
          resolve();
          setTimeout(() => supabase.removeChannel(sigCh), 1000);
        }
      });
    });
    setPipRoomId(room.id);
  }, [supabase, myProfile, setPipRoomId]);

  // 투표 생성 — 생성 즉시 자동으로 투표 오픈(바로 투표 가능) S
  const handleCreateAgenda = useCallback(async () => {
    if (!createForm.title.trim() || !createForm.description.trim() || !myProfile || creating) return;
    setCreating(true);
    const { data } = await supabase.rpc('admin_create_agenda', { p_title: createForm.title.trim(), p_description: createForm.description.trim() });
    if (!data?.success) {
      alert(data?.error ?? '투표 생성에 실패했습니다.');
    } else {
      // 생성과 동시에 자동 오픈 — 의원들이 즉시 투표 가능 S
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

  // 결과 공개 — 집계 스냅샷을 브로드캐스트하여 투표 페이지 카드에 인라인 표시 S
  const publishResult = useCallback((agenda: AgendaRow) => {
    setConfirmModal({
      title: `"${agenda.title}" 결과 공개`,
      body: `투표 결과를 모든 의원에게 공개하시겠습니까?\n공개 후 투표 페이지의 해당 안건 카드에 집계 결과가 표시됩니다.\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        if (!myProfile) return;
        const { data: votes } = await supabase.from('votes').select('choice').eq('agenda_id', agenda.id);
        const yes     = votes?.filter((v: any) => v.choice === 'yes').length     ?? 0;
        const no      = votes?.filter((v: any) => v.choice === 'no').length      ?? 0;
        const abstain = votes?.filter((v: any) => v.choice === 'abstain').length ?? 0;
        const total_voted = votes?.length ?? 0;
        const { count: total } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const { error } = await supabase.from('vote_result_broadcasts').insert({
          agenda_id: agenda.id, title: agenda.title, description: agenda.description ?? null,
          yes_count: yes, no_count: no, abstain_count: abstain,
          total_voted, total_users: total ?? 0, admin_name: myProfile.name,
        });
        if (error) { alert('결과 공개 실패: ' + error.message); return; }
        setPublishedIds(prev => new Set(prev).add(agenda.id));
      },
    });
  }, [supabase, myProfile]);

  const openDetailModal = useCallback(async (agenda: AgendaRow) => {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    setDetailModal({ agenda, totalUsers: count ?? 0 });
  }, [supabase]);

  const executeVoteResult = useCallback(async (title: string): Promise<boolean> => {
    if (!myProfile || !isAdmin) return false;
    const { data: agenda } = await supabase.from('agenda_items').select('id, title, description').eq('title', title).single();
    if (!agenda) { alert(`"${title}" 투표를 찾을 수 없습니다.`); return false; }
    const { data: votes } = await supabase.from('votes').select('choice').eq('agenda_id', agenda.id);
    const yes         = votes?.filter((v: any) => v.choice === 'yes').length     ?? 0;
    const no          = votes?.filter((v: any) => v.choice === 'no').length      ?? 0;
    const abstain     = votes?.filter((v: any) => v.choice === 'abstain').length ?? 0;
    const total_voted = votes?.length ?? 0;
    const { count: total_users } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { error } = await supabase.from('vote_result_broadcasts').insert({
      agenda_id: agenda.id, title: agenda.title, description: agenda.description ?? null,
      yes_count: yes, no_count: no, abstain_count: abstain,
      total_voted, total_users: total_users ?? 0, admin_name: myProfile.name,
    });
    if (error) { alert('결과 브로드캐스트 실패: ' + error.message); return false; }
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
          await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: input.trim(), is_command: true });
        },
      });
      return true;
    }

    if (cmd.type === 'timeout') {
      const target = await getUserByName(cmd.name);
      if (!target) { alert(`"${cmd.name}" 유저를 찾을 수 없습니다.`); return false; }
      const { data: res } = await supabase.rpc('admin_timeout_user', { p_user_id: target.id, p_seconds: cmd.seconds });
      if (res && !res.success) { alert(res.error ?? '타임아웃 실패'); return true; }
      await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: input.trim(), is_command: true });
      return true;
    }

    if (cmd.type === 'announcement') {
      const { error } = await supabase.from('announcements').insert({ content: cmd.content, author: myProfile.name, admin_id: myProfile.id });
      if (error) { alert('공지 저장에 실패했습니다: ' + error.message); return true; }
      await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: input.trim(), is_command: true });
      return true;
    }

    if (cmd.type === 'voteresult') {
      const ok = await executeVoteResult(cmd.title);
      if (!ok) return true;
      await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: input.trim(), is_command: true });
      return true;
    }

    return false;
  }, [supabase, myProfile, isAdmin, getUserByName, executeVoteResult]);

  const handleSend = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!chatInput.trim() || !myProfile || sending) return;
    setSending(true);
    setShowCmds(false);
    const isCmd = chatInput.trimStart().startsWith('/');
    if (isCmd) {
      if (!isAdmin) { alert('명령어는 Admin만 사용할 수 있습니다.'); setSending(false); return; }
      const handled = await executeCommand(chatInput);
      if (!handled) { alert('올바르지 않은 명령어 형식입니다.'); setSending(false); return; }
      setChatInput('');
      setSending(false);
      return;
    }
    await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: chatInput.trim(), is_command: false });
    setChatInput('');
    setSending(false);
  }, [chatInput, myProfile, sending, isAdmin, executeCommand, supabase]);

  const UPLOAD_MAX_BYTES  = 10 * 1024 * 1024;
  const UPLOAD_MIME_ALLOW = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf', 'text/plain']);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!myProfile || uploading) return;
    if (file.size > UPLOAD_MAX_BYTES) { alert('파일 크기는 10MB 이하여야 합니다.'); return; }
    if (!UPLOAD_MIME_ALLOW.has(file.type)) { alert('허용되지 않는 파일 형식입니다.'); return; }
    if (!await checkMagicBytes(file)) { alert('파일 내용이 확장자와 일치하지 않습니다.'); return; }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `admin-chat/${Date.now()}_${safeName}`;
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: true });
    if (!data || error) { alert('파일 업로드 실패: ' + (error?.message ?? '알 수 없는 오류')); setUploading(false); return; }
    await supabase.from('admin_chat').insert({ author_id: myProfile.id, content: '', is_command: false, file_url: data.path, file_name: file.name });
    setUploading(false);
  }, [supabase, myProfile, uploading]);

  const openBugModal = useCallback(async () => {
    setShowBugModal(true);
    setBugModalLoading(true);
    const { data } = await supabase.from('bug_reports').select('id, title, description, category, created_at, resolved, profiles!reporter_id(name)').order('created_at', { ascending: false });
    if (data) {
      setAllBugReports(data.map((b: any) => ({ ...b, reporter_name: b.profiles?.name ?? (b.reporter_id ? '알 수 없음' : 'Guest'), resolved: b.resolved ?? false })));
    }
    setBugModalLoading(false);
  }, [supabase]);

  const toggleBugResolved = useCallback(async (id: string, resolved: boolean) => {
    await supabase.from('bug_reports').update({ resolved }).eq('id', id);
    setAllBugReports((prev: BugReport[]) => prev.map((b: BugReport) => b.id === id ? { ...b, resolved } : b));
    setBugReports((prev: BugReport[]) => prev.map((b: BugReport) => b.id === id ? { ...b, resolved } : b));
  }, [supabase]);

  const unresolvedBugs = bugReports.filter((b) => !b.resolved).length;
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

  // ── 안건 카드 ───────────────────────────────────────────────────
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

  // ── 투표 관리(메인) ─────────────────────────────────────────────
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

  // ── 접속자(우측/메인) ───────────────────────────────────────────
  const usersPanel = (
    <div className="flex-1 flex flex-col min-h-0">
      {(isAdmin || isMod) && pendingCalls.length > 0 && (
        <div className="p-3 space-y-2">
          {pendingCalls.map((call) => (
            <div key={call.id} className="flex items-center gap-2.5 bg-[rgba(255,164,43,0.08)] border border-[rgba(255,164,43,0.25)] rounded-xl px-3 py-2.5">
              <span className="w-7 h-7 rounded-full bg-[rgba(255,164,43,0.18)] grid place-items-center text-warning shrink-0">
                <Bell size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-text-base truncate">{call.caller_name} 호출</p>
                <p className="text-[11px] text-text-secondary">{fmt(call.created_at)} · 지원 요청</p>
              </div>
              <button onClick={() => handleJoinCall(call)} className="px-3 py-1.5 rounded-full bg-green text-black text-xs font-bold hover:brightness-110 transition-all shrink-0">
                참가
              </button>
            </div>
          ))}
        </div>
      )}
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
                {list.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2.5 px-1.5 py-2 rounded-lg hover:bg-surface-2 transition-colors">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                    <span className="flex-1 text-[13px] text-text-near-white truncate">{u.name}</span>
                    <span className={cn('text-[10px] font-extrabold px-1.5 py-0.5 rounded-full', PP_BADGE[u.pp] ?? PP_BADGE['무소속'])}>{u.pp}</span>
                  </div>
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  );

  // ── 스태프 채팅 ─────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3.5 py-3 flex items-center gap-2 border-b border-[var(--hairline)] shrink-0">
        <Shield size={14} className={isAdmin ? 'text-negative' : 'text-warning'} />
        <span className="text-[13px] font-bold text-text-base">{isAdmin ? '관리자 전용 채널' : 'Staff 채널'}</span>
        <span className="ml-auto text-[11px] text-[#666]">Private</span>
        {isAdmin && (
          <button onClick={openBugModal} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(243,114,127,0.1)] text-negative hover:bg-[rgba(243,114,127,0.2)] transition-colors">
            <Bug size={11} />
            버그
            {unresolvedBugs > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-negative text-white text-[10px] font-bold min-w-[1.1rem] text-center leading-none">{unresolvedBugs}</span>
            )}
          </button>
        )}
      </div>

      <div
        ref={msgPanelRef}
        onScroll={handleMsgScroll}
        onDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e: any) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer?.files?.[0]; if (file) handleFileUpload(file); }}
        className={cn('flex-1 overflow-y-auto p-3.5 space-y-3 relative transition-all', isDragging && 'ring-2 ring-inset ring-green')}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(30,215,96,0.05)] pointer-events-none z-10">
            <p className="text-sm font-semibold text-green">파일을 여기에 놓으세요</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-xs font-extrabold', msg.is_command ? 'text-warning' : (ROLE_COLOR[msg.profile_role] ?? 'text-green'))}>{msg.profile_name}</span>
              <span className="text-[11px] text-[#666]">{fmt(msg.created_at)}</span>
              {msg.is_command && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,164,43,0.12)] text-warning font-mono">CMD</span>}
            </div>
            {msg.file_url ? (
              <FileDisplay filePath={msg.file_url} fileName={msg.file_name} />
            ) : (
              <p className={cn('text-[13px] rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] inline-block leading-relaxed', msg.is_command ? 'bg-[rgba(255,164,43,0.1)] text-warning font-mono' : 'bg-surface-2 text-text-near-white')}>
                {msg.content}
              </p>
            )}
          </div>
        ))}
      </div>

      {isAdmin && showCmds && (
        <div className="mx-3 mb-1 border border-[var(--hairline)] rounded-xl overflow-hidden bg-surface-card shadow-[var(--shadow-heavy)]">
          {ADMIN_COMMANDS.filter((c) => c.startsWith(chatInput)).map((cmd) => (
            <button key={cmd} onMouseDown={() => { setChatInput(CMD_HINT[cmd] + ' '); setShowCmds(false); }}
              className="w-full text-left px-4 py-2.5 text-sm font-mono text-green hover:bg-surface-2 transition-colors border-b last:border-0 border-[var(--hairline)]">
              <span className="font-bold">{cmd}</span>
              <span className="text-[#666] ml-2 text-xs">{CMD_HINT[cmd].slice(cmd.length)}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="p-2.5 border-t border-[var(--hairline)] flex gap-2 shrink-0 items-center">
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="파일 첨부"
          className="p-2.5 rounded-full text-text-secondary hover:text-green hover:bg-surface-2 transition-colors disabled:opacity-40 shrink-0">
          <Plus size={15} />
        </button>
        <input
          ref={chatInputRef}
          value={chatInput}
          onChange={(e) => { setChatInput(e.target.value); setShowCmds(isAdmin && e.target.value.startsWith('/')); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setShowCmds(false); return; }
            if (e.key === 'Tab') {
              const matches = ADMIN_COMMANDS.filter(c => c.startsWith(chatInput));
              if (matches.length > 0) { e.preventDefault(); setChatInput(CMD_HINT[matches[0]] + ' '); setShowCmds(false); }
            }
          }}
          placeholder={uploading ? '파일 업로드 중...' : isAdmin ? '메시지 또는 /명령어 "인자"' : '메시지를 입력하세요...'}
          disabled={uploading}
          maxLength={2000}
          className="flex-1 px-4 py-2.5 rounded-full bg-surface-2 text-[13px] text-text-base outline-none focus:shadow-[#fff_0_0_0_1px_inset] transition-all disabled:opacity-60"
        />
        <button type="submit" disabled={!chatInput.trim() || sending || uploading}
          className="w-10 h-10 rounded-full bg-green text-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 shrink-0">
          <Send size={15} />
        </button>
      </form>
    </div>
  );

  // ── 네비 레일 ───────────────────────────────────────────────────
  const railItem = (active: boolean, icon: React.ReactNode, label: string, onClick: () => void, badge?: number) => (
    <button onClick={onClick}
      className={cn('flex items-center gap-3.5 w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
        active ? 'text-text-base bg-surface-2' : 'text-text-secondary hover:text-text-base')}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge ? <span className="bg-negative text-white text-[11px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center">{badge}</span> : null}
    </button>
  );

  const rail = (
    <aside className="w-[230px] shrink-0 bg-surface rounded-xl flex flex-col p-3.5 gap-1.5 max-md:hidden">
      {isAdmin && railItem(true, <BarChart2 size={18} />, '투표 관리', () => setMobileView('main'))}
      {isAdmin && railItem(rightTab === 'chat', <MessageSquare size={18} />, '스태프 채팅', () => setRightTab('chat'))}
      {!isAdmin && railItem(true, <MessageSquare size={18} />, '스태프 채팅', () => {})}
      {railItem(rightTab === 'users', <Users size={18} />, '접속자', () => setRightTab('users'))}
      {isAdmin && railItem(false, <Bug size={18} />, '버그 제보', openBugModal, unresolvedBugs || undefined)}
      {isAdmin && railItem(false, <Megaphone size={18} />, '공지', () => { setRightTab('chat'); setChatInput('/announcement "'); setTimeout(() => chatInputRef.current?.focus(), 50); })}
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

  // ── 렌더 ───────────────────────────────────────────────────────
  return (
    <>
      {/* ── 버그 제보 모달 ───────────────────────────────────────── */}
      {showBugModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5" onClick={(e) => { if (e.target === e.currentTarget) setShowBugModal(false); }}>
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-lg flex flex-col max-h-[80vh] border border-[var(--hairline)]">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--hairline)] shrink-0">
              <Bug size={15} className="text-negative" />
              <span className="font-bold text-text-base flex-1 text-sm">버그 제보 전체 목록</span>
              <button onClick={() => setShowBugModal(false)} className="p-1.5 rounded-lg text-text-secondary hover:text-text-base hover:bg-surface-hover transition-colors"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bugModalLoading ? (
                <p className="text-sm text-text-secondary text-center py-8">로딩 중...</p>
              ) : allBugReports.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">제보 없음</p>
              ) : (
                allBugReports.map((bug) => (
                  <div key={bug.id} className={cn('rounded-xl border px-4 py-3 space-y-1.5 transition-all', bug.resolved ? 'bg-surface border-[var(--hairline)] opacity-50' : 'bg-[rgba(243,114,127,0.06)] border-[rgba(243,114,127,0.2)]')}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={bug.resolved} onChange={(e) => toggleBugResolved(bug.id, e.target.checked)} className="mt-0.5 shrink-0 accent-green w-4 h-4 cursor-pointer" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-xs font-bold text-negative shrink-0', bug.resolved && 'line-through')}>[{bug.category}]</span>
                          <span className={cn('text-sm font-semibold text-text-base', bug.resolved && 'line-through')}>{bug.title}</span>
                        </div>
                        <p className={cn('text-xs text-text-secondary leading-relaxed', bug.resolved && 'line-through')}>{bug.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <span>{bug.reporter_name}</span><span>·</span><span>{fmt(bug.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 투표 자세히 보기 모달 ───────────────────────────────── */}
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

      {/* ── 투표 생성 모달 ──────────────────────────────────────── */}
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

      {/* ── 확인 모달 ───────────────────────────────────────────── */}
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

      {/* ── 3열 대시보드 ────────────────────────────────────────── */}
      <div className="h-[calc(100vh-4rem)] flex gap-2 p-2 bg-black overflow-hidden max-md:h-auto max-md:min-h-[calc(100vh-4rem)] max-md:flex-col max-md:gap-0 max-md:p-0 max-md:pb-16">
        {rail}

        {/* 메인 — Admin: 투표 관리 / Mod: 스태프 채팅 */}
        <main className={cn('flex-1 min-w-0 bg-surface rounded-xl flex flex-col overflow-hidden max-md:rounded-none', mobileView === 'side' && 'max-md:hidden')}>
          {isAdmin ? agendaMain : chatPanel}
        </main>

        {/* 우측 — Admin: 접속자/채팅 탭 / Mod: 접속자 */}
        <aside className={cn('w-[340px] shrink-0 bg-surface rounded-xl flex flex-col overflow-hidden max-md:w-full max-md:rounded-none', mobileView === 'main' && 'max-md:hidden')}>
          {isAdmin ? (
            <>
              <div className="flex gap-1 p-3 pb-0 shrink-0">
                {(['users', 'chat'] as const).map((tab) => (
                  <button key={tab} onClick={() => setRightTab(tab)}
                    className={cn('flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors', rightTab === tab ? 'bg-surface-2 text-text-base' : 'text-text-secondary hover:text-text-base')}>
                    {tab === 'users' ? <>접속자 <span className="text-text-secondary">({onlineCount})</span></> : '스태프 채팅'}
                  </button>
                ))}
              </div>
              {rightTab === 'users' ? usersPanel : chatPanel}
            </>
          ) : (
            <>
              <div className="px-3.5 py-3 flex items-center gap-2 border-b border-[var(--hairline)] shrink-0">
                <Users size={14} className="text-green" />
                <span className="text-[13px] font-bold text-text-base">접속자</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(30,215,96,0.15)] text-green font-semibold">{onlineCount}명</span>
              </div>
              {usersPanel}
            </>
          )}
        </aside>
      </div>

      {/* ── 모바일 하단 탭바 ────────────────────────────────────── */}
      <nav className="hidden max-md:flex fixed bottom-0 inset-x-0 z-[60] bg-[rgba(18,18,18,0.95)] backdrop-blur-[12px] border-t border-[var(--hairline)]">
        {([['main', isAdmin ? '투표 관리' : '스태프 채팅', <BarChart2 key="a" size={20} />],
           ['side', isAdmin ? '접속자 · 채팅' : '접속자', <Users key="b" size={20} />]] as const).map(([view, label, icon]) => (
          <button key={view} onClick={() => setMobileView(view as 'main' | 'side')}
            className={cn('flex-1 py-2.5 flex flex-col items-center gap-1 text-[11px] font-bold transition-colors', mobileView === view ? 'text-green' : 'text-text-secondary')}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

// ── 아이콘 버튼 ───────────────────────────────────────────────────
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
