'use client';

// Admin/Mod 대시보드 — Admin: 풀기능 / Mod: 접속자 + 채팅 + 호출참가 S
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Shield, BarChart2, Send, Plus,
  CheckCircle2, XCircle, AlertTriangle, Bell, Bug, X,
  Vote, Eye, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';
import { useOnlineUsers, type OnlineUser } from '@/components/providers/OnlineUsersContext';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import FileDisplay from '@/components/chat/FileDisplay';

// ── Types ───────────────────────────────────────────────────────────
type ChatMsg      = { id: string; content: string; is_command: boolean; created_at: string; profile_name: string; profile_role: string; file_url: string | null; file_name: string | null };
type AdminLog     = { id: string; action: string; detail: string | null; created_at: string; admin_name: string };
type AgendaRow    = { id: string; title: string; description: string | null; is_open: boolean; is_completed: boolean; yes_count: number; no_count: number; abstain_count: number; total_count: number };
type ConfirmModal = { title: string; body: string; onConfirm: () => Promise<void> };
type MyProfile    = { id: string; name: string; role: string };
type AdminCall    = { id: string; caller_id: string; caller_name: string; created_at: string };
type BugReport    = { id: string; reporter_name: string; title: string; description: string; category: string; created_at: string; resolved: boolean };
type DetailModal  = { agenda: AgendaRow; totalUsers: number };
type CreateAgendaForm = { title: string; description: string };

const ROLE_COLOR: Record<string, string> = {
  admin: 'text-negative',
  mod:   'text-warning',
  user:  'text-green',
};

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-[rgba(83,157,245,0.15)] text-jinbo border border-[rgba(83,157,245,0.3)]',
  '보수':   'bg-[rgba(243,114,127,0.15)] text-negative border border-[rgba(243,114,127,0.3)]',
  '중도':   'bg-[rgba(255,164,43,0.15)] text-warning border border-[rgba(255,164,43,0.3)]',
  '무소속': 'bg-[rgba(255,255,255,0.08)] text-text-secondary border border-[rgba(255,255,255,0.15)]',
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

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

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
  const supabase = useRef(createClient()).current;
  const { onlineUsers } = useOnlineUsers();
  const { setPipRoomId } = usePIPChat();

  const [myProfile, setMyProfile]             = useState<MyProfile | null>(null);
  const [messages, setMessages]               = useState<ChatMsg[]>([]);
  const [logs, setLogs]                       = useState<AdminLog[]>([]);
  const [agendas, setAgendas]                 = useState<AgendaRow[]>([]);
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

  const msgPanelRef   = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const fileInputRef  = useRef<HTMLInputElement>(null);

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

  // ── 초기 로드 + 실시간 구독 ─────────────────────────────────────
  useEffect(() => {
    let chatCh:   ReturnType<typeof supabase.channel>;
    let logCh:    ReturnType<typeof supabase.channel>;
    let callCh:   ReturnType<typeof supabase.channel>;
    let agendaCh: ReturnType<typeof supabase.channel>;
    let bugCh:    ReturnType<typeof supabase.channel> | undefined;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('id, name, role').eq('id', user.id).single();
      if (prof) setMyProfile(prof as MyProfile);

      const { data: chatInit } = await supabase
        .from('admin_chat')
        .select('id, content, is_command, created_at, file_url, file_name, profiles!author_id(name, role)')
        .order('created_at', { ascending: true }).limit(100);
      if (chatInit) {
        setMessages(chatInit.map((m: any) => ({ ...m, profile_name: m.profiles?.name ?? '알 수 없음', profile_role: m.profiles?.role ?? 'user', file_url: m.file_url ?? null, file_name: m.file_name ?? null })));
      }

      const { data: logInit } = await supabase
        .from('admin_logs')
        .select('id, action, detail, created_at, profiles!admin_id(name)')
        .order('created_at', { ascending: false }).limit(30);
      if (logInit) {
        setLogs(logInit.map((l: any) => ({ ...l, admin_name: l.profiles?.name ?? '알 수 없음' })));
      }

      const { data: callsInit } = await supabase
        .from('admin_calls')
        .select('id, caller_id, created_at, profiles!caller_id(name)')
        .eq('status', 'pending').order('created_at');
      if (callsInit) {
        setPendingCalls(callsInit.map((c: any) => ({ ...c, caller_name: c.profiles?.name ?? '알 수 없음' })));
      }

      await refreshAgendas();

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

      logCh = supabase.channel('admin-log-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, async (payload: { new: any }) => {
          const row = payload.new;
          const { data: p } = await supabase.from('profiles').select('name').eq('id', row.admin_id).single();
          setLogs((prev: AdminLog[]) => [{ ...row, admin_name: p?.name ?? '알 수 없음' }, ...prev].slice(0, 30));
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
    }

    init();
    return () => {
      if (chatCh)   supabase.removeChannel(chatCh);
      if (logCh)    supabase.removeChannel(logCh);
      if (callCh)   supabase.removeChannel(callCh);
      if (agendaCh) supabase.removeChannel(agendaCh);
      if (bugCh)    supabase.removeChannel(bugCh);
    };
  }, [supabase]);

  const refreshAgendas = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_with_votes')
      .select('id, title, description, is_open, is_completed, yes_count, no_count, abstain_count, total_count')
      .order('display_order');
    if (data) setAgendas(data as AgendaRow[]);
  }, [supabase]);

  const getUserByName = useCallback(async (name: string) => {
    const { data } = await supabase.from('profiles').select('id, name').eq('name', name).single();
    return data as { id: string; name: string } | null;
  }, [supabase]);

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

  const handleCreateAgenda = useCallback(async () => {
    if (!createForm.title.trim() || !myProfile || creating) return;
    setCreating(true);
    const { data } = await supabase.rpc('admin_create_agenda', { p_title: createForm.title.trim(), p_description: createForm.description.trim() });
    if (!data?.success) {
      alert(data?.error ?? '투표 생성에 실패했습니다.');
    } else {
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '' });
    }
    setCreating(false);
  }, [supabase, myProfile, createForm, creating]);

  const toggleAgenda = useCallback((agenda: AgendaRow, open: boolean) => {
    setConfirmModal({
      title: open ? `"${agenda.title}" 투표 열기` : `"${agenda.title}" 투표 닫기`,
      body: open ? `투표를 시작하시겠습니까?\n모든 사용자가 투표할 수 있게 됩니다.` : `투표를 일시 중단하시겠습니까?\n언제든 다시 열 수 있습니다.`,
      onConfirm: async () => {
        const { data } = await supabase.rpc('admin_toggle_agenda', { p_agenda_id: agenda.id, p_open: open });
        if (data && !data.success) alert(data.error ?? '처리 실패');
      },
    });
  }, [supabase]);

  const completeAgenda = useCallback((agenda: AgendaRow) => {
    setConfirmModal({
      title: `"${agenda.title}" 투표 완료`,
      body: `투표를 완료 처리하시겠습니까?\n완료 후 데이터는 잠기며 Vote 탭에서 숨겨집니다.\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        const { data } = await supabase.rpc('admin_complete_agenda', { p_agenda_id: agenda.id });
        if (data && !data.success) alert(data.error ?? '처리 실패');
      },
    });
  }, [supabase]);

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

  if (!myProfile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── 렌더 ───────────────────────────────────────────────────────
  return (
    <>
      {/* ── 버그 제보 모달 ───────────────────────────────────────── */}
      {showBugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-lg mx-4 flex flex-col max-h-[80vh] border border-[var(--hairline)]">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--hairline)] shrink-0">
              <Bug size={15} className="text-negative" />
              <span className="font-bold text-text-base flex-1 text-sm">버그 제보 전체 목록</span>
              <button onClick={() => setShowBugModal(false)} className="p-1.5 rounded-lg text-text-secondary hover:text-text-base hover:bg-surface-hover transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bugModalLoading ? (
                <p className="text-sm text-text-secondary text-center py-8">로딩 중...</p>
              ) : allBugReports.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">제보 없음</p>
              ) : (
                allBugReports.map((bug: BugReport) => (
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
        const totalUsers = detailModal.totalUsers || 1;
        const participationPct = Math.round((a.total_count / totalUsers) * 100);
        const yesPct     = Math.round((a.yes_count     / totalVoted) * 100);
        const noPct      = Math.round((a.no_count      / totalVoted) * 100);
        const abstainPct = 100 - yesPct - noPct;
        const bars = [
          { label: '찬성', count: a.yes_count,     pct: yesPct,     barColor: 'var(--yes)',     textClass: 'text-green' },
          { label: '반대', count: a.no_count,      pct: noPct,      barColor: 'var(--no)',      textClass: 'text-negative' },
          { label: '기권', count: a.abstain_count, pct: abstainPct, barColor: 'var(--abstain)', textClass: 'text-text-secondary' },
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-md mx-4 overflow-hidden border border-[var(--hairline)]">
              <div className="bg-green px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-black/60 uppercase tracking-wider mb-0.5">
                    {a.is_completed ? '투표 완료' : a.is_open ? '투표 진행 중' : '투표 대기 중'}
                  </p>
                  <h2 className="text-base font-extrabold text-black leading-tight">{a.title}</h2>
                </div>
                <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg text-black/60 hover:bg-black/10 transition-colors">
                  <X size={17} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {a.description && (
                  <p className="text-xs text-text-secondary leading-relaxed border-l-2 border-green pl-3 whitespace-pre-line">
                    {a.description}
                  </p>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-text-base">전체 투표율</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-md mx-4 p-6 border border-[var(--hairline)]">
            <div className="flex items-center gap-2 mb-5">
              <Vote size={15} className="text-green" />
              <span className="font-bold text-text-base flex-1 text-sm">새 투표 생성</span>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-text-secondary hover:text-text-base hover:bg-surface-hover transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  투표 제목 <span className="text-negative">*</span>
                </label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={100}
                  placeholder="예: 제 1호 안건"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--hairline)] bg-surface-2 text-sm text-text-base outline-none focus:border-green transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  세부사항 <span className="text-negative">*</span>
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  maxLength={2000}
                  rows={5}
                  placeholder="투표할 사항에 대한 세부 내용을 입력하세요."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--hairline)] bg-surface-2 text-sm text-text-base outline-none focus:border-green transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--hairline)] text-text-secondary hover:bg-surface-hover transition-colors"
              >
                취소
              </button>
              <button
                disabled={!createForm.title.trim() || !createForm.description.trim() || creating}
                onClick={handleCreateAgenda}
                className="px-4 py-2 text-sm rounded-lg bg-green text-black font-semibold hover:brightness-110 transition-all disabled:opacity-40"
              >
                {creating ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 확인 모달 ───────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-[var(--shadow-heavy)] w-full max-w-sm mx-4 p-6 border border-[var(--hairline)]">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-warning mt-0.5 shrink-0" size={19} />
              <div>
                <p className="font-bold text-text-base text-sm">{confirmModal.title}</p>
                <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{confirmModal.body}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--hairline)] text-text-secondary hover:bg-surface-hover transition-colors"
              >
                취소
              </button>
              <button
                disabled={confirming}
                onClick={async () => {
                  setConfirming(true);
                  await confirmModal.onConfirm();
                  setConfirming(false);
                  setConfirmModal(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-negative text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {confirming ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3열 레이아웃 ────────────────────────────────────────── */}
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">

        {/* 좌측: 실시간 접속자 목록 */}
        {(isAdmin || isMod) && (
          <aside className="w-60 shrink-0 border-r border-[var(--hairline)] bg-surface flex flex-col max-md:hidden">
            <div className="px-4 py-3.5 border-b border-[var(--hairline)]">
              <div className="flex items-center gap-2 text-sm font-bold text-text-base">
                <Users size={13} className="text-green" />
                접속자
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(30,215,96,0.15)] text-green font-semibold">
                  {onlineCount}명
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-text-secondary px-3 py-4 text-center">접속자 없음</p>
              ) : (
                <>
                  {adminUsers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-negative px-3 py-1 uppercase tracking-wider">Admin</p>
                      <div className="space-y-0.5">
                        {adminUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                            <span className="w-2 h-2 rounded-full bg-negative shrink-0" />
                            <span className="text-sm text-text-base truncate flex-1">{u.name}</span>
                            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0', PP_BADGE[u.pp] ?? PP_BADGE['무소속'])}>{u.pp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {modUsers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-warning px-3 py-1 uppercase tracking-wider">Mod</p>
                      <div className="space-y-0.5">
                        {modUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                            <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                            <span className="text-sm text-text-base truncate flex-1">{u.name}</span>
                            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0', PP_BADGE[u.pp] ?? PP_BADGE['무소속'])}>{u.pp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {regularUsers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-green px-3 py-1 uppercase tracking-wider">User</p>
                      <div className="space-y-0.5">
                        {regularUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                            <span className="w-2 h-2 rounded-full bg-green shrink-0" />
                            <span className="text-sm text-text-base truncate flex-1">{u.name}</span>
                            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0', PP_BADGE[u.pp] ?? PP_BADGE['무소속'])}>{u.pp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        )}

        {/* 중앙: 채팅 */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-[var(--hairline)] bg-bg-base">
          <div className="px-4 py-3.5 border-b border-[var(--hairline)] flex items-center gap-2 shrink-0">
            <Shield size={13} className="text-green" />
            <span className="text-sm font-bold text-text-base">
              {isAdmin ? '관리자 전용 채널' : 'Staff 채널'}
            </span>
            <span className="ml-auto text-xs text-text-secondary">Private</span>
            {isMod && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,164,43,0.1)] text-warning font-semibold border border-[rgba(255,164,43,0.2)]">Mod</span>
            )}
            {isAdmin && (
              <button onClick={openBugModal} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(243,114,127,0.1)] text-negative hover:bg-[rgba(243,114,127,0.2)] transition-colors">
                <Bug size={11} />
                버그 제보
                {bugReports.filter((b: BugReport) => !b.resolved).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-negative text-white text-[10px] font-bold min-w-[1.25rem] text-center leading-none">
                    {bugReports.filter((b: BugReport) => !b.resolved).length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 관리자 호출 알림 */}
          {(isAdmin || isMod) && pendingCalls.length > 0 && (
            <div className="border-b border-[rgba(255,164,43,0.2)] bg-[rgba(255,164,43,0.05)] shrink-0">
              <div className="px-4 pt-2.5 pb-1 flex items-center gap-2">
                <Bell size={12} className="text-warning" style={{ animation: 'pulse-dot 1s ease-in-out infinite' }} />
                <span className="text-xs font-bold text-warning">관리자 호출 {pendingCalls.length}건 대기 중</span>
              </div>
              <div className="px-3 pb-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                {pendingCalls.map((call: AdminCall) => (
                  <div key={call.id} className="flex items-center gap-3 bg-surface rounded-xl border border-[rgba(255,164,43,0.2)] px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-[rgba(255,164,43,0.15)] flex items-center justify-center shrink-0">
                      <Bell size={11} className="text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-base truncate">{call.caller_name}</p>
                      <p className="text-xs text-text-secondary">{fmt(call.created_at)} 호출</p>
                    </div>
                    <button onClick={() => handleJoinCall(call)} className="text-xs px-3 py-1.5 rounded-lg bg-warning text-black font-bold hover:brightness-110 transition-all shrink-0">
                      참가하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메시지 목록 */}
          <div
            ref={msgPanelRef}
            onScroll={handleMsgScroll}
            onDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e: any) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer?.files?.[0]; if (file) handleFileUpload(file); }}
            className={cn('flex-1 overflow-y-auto p-4 space-y-3 relative transition-all', isDragging && 'ring-2 ring-inset ring-green')}
          >
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(30,215,96,0.05)] pointer-events-none z-10 rounded">
                <p className="text-sm font-semibold text-green">파일을 여기에 놓으세요</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-xs font-bold', msg.is_command ? 'text-warning' : (ROLE_COLOR[msg.profile_role] ?? 'text-green'))}>
                    {msg.profile_name}
                  </span>
                  <span className="text-xs text-text-secondary">{fmt(msg.created_at)}</span>
                  {msg.is_command && <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,164,43,0.1)] text-warning font-mono">CMD</span>}
                </div>
                {msg.file_url ? (
                  <FileDisplay filePath={msg.file_url} fileName={msg.file_name} />
                ) : (
                  <p className={cn('text-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-lg', msg.is_command ? 'bg-[rgba(255,164,43,0.1)] text-warning font-mono' : 'bg-surface text-text-base')}>
                    {msg.content}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 명령어 자동완성 (Admin only) */}
          {isAdmin && showCmds && (
            <div className="mx-4 mb-1 border border-[var(--hairline)] rounded-xl overflow-hidden bg-surface-card shadow-[var(--shadow-heavy)]">
              {ADMIN_COMMANDS.filter((c) => c.startsWith(chatInput)).map((cmd) => (
                <button key={cmd} onMouseDown={() => { setChatInput(CMD_HINT[cmd] + ' '); setShowCmds(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-mono text-green hover:bg-surface-hover transition-colors border-b last:border-0 border-[var(--hairline)]">
                  <span className="font-bold">{cmd}</span>
                  <span className="text-text-secondary ml-2 text-xs">{CMD_HINT[cmd].slice(cmd.length)}</span>
                </button>
              ))}
            </div>
          )}

          {/* 입력창 */}
          <form onSubmit={handleSend} className="p-3 border-t border-[var(--hairline)] flex gap-2 shrink-0 items-center">
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="파일 첨부"
              className="p-2.5 rounded-xl text-text-secondary hover:text-green hover:bg-surface-hover transition-colors disabled:opacity-40 shrink-0">
              <Plus size={15} />
            </button>
            <input
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
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--hairline)] bg-surface text-sm text-text-base outline-none focus:border-green transition-colors disabled:opacity-60"
            />
            <button type="submit" disabled={!chatInput.trim() || sending || uploading}
              className="w-9 h-9 rounded-full bg-green text-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 shrink-0">
              <Send size={14} />
            </button>
          </form>
        </section>

        {/* 우측: 스탯 + 안건관리 + 로그 (Admin only) */}
        {isAdmin && (
          <aside className="w-80 shrink-0 bg-surface flex flex-col overflow-hidden max-md:hidden">
            <div className="px-4 py-3.5 border-b border-[var(--hairline)] shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-text-base">
                <BarChart2 size={13} className="text-green" />
                현황 &amp; 관리
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* 퀵 스탯 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '접속 중', value: onlineCount },
                  { label: '진행 안건', value: agendas.filter(a => a.is_open).length },
                  { label: '총 투표수', value: agendas.reduce((s, a) => s + a.total_count, 0) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface-2 border border-[var(--hairline)] p-3 text-center">
                    <p className="text-xl font-extrabold text-green">{s.value}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 안건 목록 */}
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex-1">
                    안건 투표 관리
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[rgba(30,215,96,0.1)] text-green hover:bg-[rgba(30,215,96,0.2)] font-bold transition-colors"
                  >
                    <Plus size={10} />
                    투표 생성
                  </button>
                </div>

                <div className="space-y-2">
                  {agendas.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-3">안건 없음</p>
                  ) : (
                    agendas.map((a) => (
                      <div key={a.id} className={cn(
                        'rounded-xl border px-3 py-2.5 space-y-2',
                        a.is_completed
                          ? 'bg-surface-2 border-[var(--hairline)] opacity-60'
                          : 'bg-surface-2 border-[var(--hairline-strong)]'
                      )}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-base truncate">{a.title}</p>
                            <p className="text-[11px] text-text-secondary mt-0.5">
                              {a.is_completed ? '완료됨' : a.is_open ? `진행 중 · ${a.total_count}표` : `대기 중 · ${a.total_count}표`}
                            </p>
                          </div>
                          {a.is_completed && <Lock size={11} className="text-text-secondary shrink-0 mt-0.5" />}
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openDetailModal(a)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-surface text-text-secondary hover:bg-surface-hover transition-colors"
                          >
                            <Eye size={10} />
                            자세히
                          </button>

                          {!a.is_completed && (
                            <>
                              {!a.is_open && (
                                <button
                                  onClick={() => toggleAgenda(a, true)}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(30,215,96,0.1)] text-green hover:bg-[rgba(30,215,96,0.2)] transition-colors"
                                >
                                  <CheckCircle2 size={10} />
                                  열기
                                </button>
                              )}

                              {a.is_open && (
                                <button
                                  onClick={() => toggleAgenda(a, false)}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-surface text-text-secondary hover:bg-surface-hover transition-colors"
                                >
                                  <XCircle size={10} />
                                  닫기
                                </button>
                              )}

                              <button
                                onClick={() => completeAgenda(a)}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(243,114,127,0.1)] text-negative hover:bg-[rgba(243,114,127,0.2)] transition-colors ml-auto"
                              >
                                <Lock size={10} />
                                완료
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 관리자 로그 */}
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 px-1">
                  관리자 로그
                </p>
                <div className="space-y-1.5">
                  {logs.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">로그 없음</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex gap-2 text-xs bg-surface-2 rounded-lg px-3 py-2 border border-[var(--hairline)]">
                        <span className="text-text-secondary shrink-0">{fmt(log.created_at)}</span>
                        <span className="flex-1 text-text-secondary truncate">{log.detail ?? log.action}</span>
                        <span className="text-green font-medium shrink-0">{log.admin_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 버그 제보 */}
              <div>
                <p className="text-[10px] font-bold text-negative uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                  <Bug size={10} />
                  버그 제보
                </p>
                <div className="space-y-1.5">
                  {bugReports.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">제보 없음</p>
                  ) : (
                    bugReports.map((bug: BugReport) => (
                      <div key={bug.id} className="rounded-xl bg-[rgba(243,114,127,0.06)] border border-[rgba(243,114,127,0.2)] px-3 py-2.5 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs font-bold text-negative shrink-0">[{bug.category}]</span>
                          <span className="text-xs font-semibold text-text-base leading-tight">{bug.title}</span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{bug.description}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-text-secondary">{bug.reporter_name}</span>
                          <span className="text-text-secondary">·</span>
                          <span className="text-[11px] text-text-secondary">{fmt(bug.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
