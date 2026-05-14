'use client';

// Admin/Mod 대시보드 — Admin: 풀기능 / Mod: 접속자 + 채팅 + 호출참가 S
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Shield, BarChart2, Send,
  CheckCircle2, XCircle, AlertTriangle, Bell, Bug, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';
import { useOnlineUsers, type OnlineUser } from '@/components/providers/OnlineUsersContext';
import { usePIPChat } from '@/components/providers/PIPChatContext';

// ── Types ──────────────────────────────────────────────────────────
type ChatMsg      = { id: string; content: string; is_command: boolean; created_at: string; profile_name: string; profile_role: string };
type AdminLog     = { id: string; action: string; detail: string | null; created_at: string; admin_name: string };
type AgendaRow    = { id: string; title: string; category: string; is_open: boolean; yes_count: number; no_count: number; abstain_count: number; total_count: number };
type ConfirmModal = { title: string; body: string; onConfirm: () => Promise<void> };
type MyProfile    = { id: string; name: string; role: string };
type AdminCall    = { id: string; caller_id: string; caller_name: string; created_at: string };
type BugReport    = { id: string; reporter_name: string; title: string; description: string; category: string; created_at: string; resolved: boolean };

const ROLE_COLOR: Record<string, string> = {
  admin: 'text-red-primary',
  mod:   'text-yellow-primary',
  user:  'text-green-600 dark:text-green-400',
};

const ADMIN_COMMANDS = ['/kick', '/ban', '/timeout', '/announcement'];
const CMD_HINT: Record<string, string> = {
  '/kick':         '/kick "사용자명"',
  '/ban':          '/ban "사용자명"',
  '/timeout':      '/timeout "사용자명" "초"',
  '/announcement': '/announcement "내용"',
};

function parseCommand(input: string) {
  const kick    = input.match(/^\/kick\s+"([^"]+)"$/);
  const ban     = input.match(/^\/ban\s+"([^"]+)"$/);
  const timeout = input.match(/^\/timeout\s+"([^"]+)"\s+"(\d+)"$/);
  const ann     = input.match(/^\/announcement\s+"(.+)"$/);
  if (kick)    return { type: 'kick'         as const, name: kick[1] };
  if (ban)     return { type: 'ban'          as const, name: ban[1] };
  if (timeout) return { type: 'timeout'      as const, name: timeout[1], seconds: parseInt(timeout[2]) };
  if (ann)     return { type: 'announcement' as const, content: ann[1] };
  return null;
}

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const supabase = useRef(createClient()).current;
  const { onlineUsers } = useOnlineUsers();
  const { setPipRoomId } = usePIPChat();

  const [myProfile, setMyProfile]       = useState<MyProfile | null>(null);
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [logs, setLogs]                 = useState<AdminLog[]>([]);
  const [agendas, setAgendas]           = useState<AgendaRow[]>([]);
  const [pendingCalls, setPendingCalls] = useState<AdminCall[]>([]);
  const [bugReports, setBugReports]         = useState<BugReport[]>([]);
  const [showBugModal, setShowBugModal]     = useState(false);
  const [allBugReports, setAllBugReports]   = useState<BugReport[]>([]);
  const [bugModalLoading, setBugModalLoading] = useState(false);
  const [chatInput, setChatInput]           = useState('');
  const [showCmds, setShowCmds]             = useState(false);
  const [confirmModal, setConfirmModal]     = useState<ConfirmModal | null>(null);
  const [confirming, setConfirming]         = useState(false);
  const [sending, setSending]               = useState(false);
  const msgPanelRef   = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const announceChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isAdmin = myProfile?.role === 'admin';
  const isMod   = myProfile?.role === 'mod';

  const adminUsers   = onlineUsers.filter((u: OnlineUser) => u.role === 'admin');
  const modUsers     = onlineUsers.filter((u: OnlineUser) => u.role === 'mod');
  const regularUsers = onlineUsers.filter((u: OnlineUser) => u.role === 'user');
  const onlineCount = onlineUsers.length;

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

  // ── 초기 로드 + 실시간 구독 ──────────────────────────────────────
  useEffect(() => {
    let chatCh:  ReturnType<typeof supabase.channel>;
    let logCh:   ReturnType<typeof supabase.channel>;
    let callCh:  ReturnType<typeof supabase.channel>;
    let bugCh:   ReturnType<typeof supabase.channel> | undefined;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single();
      if (prof) setMyProfile(prof as MyProfile);

      // 채팅 초기 로드
      const { data: chatInit } = await supabase
        .from('admin_chat')
        .select('id, content, is_command, created_at, profiles!author_id(name, role)')
        .order('created_at', { ascending: true })
        .limit(100);
      if (chatInit) {
        setMessages(chatInit.map((m: any) => ({ ...m, profile_name: m.profiles?.name ?? '알 수 없음', profile_role: m.profiles?.role ?? 'user' })));
      }

      // 로그 초기 로드
      const { data: logInit } = await supabase
        .from('admin_logs')
        .select('id, action, detail, created_at, profiles!admin_id(name)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (logInit) {
        setLogs(logInit.map((l: any) => ({ ...l, admin_name: l.profiles?.name ?? '알 수 없음' })));
      }

      // 대기 중인 관리자 호출 초기 로드
      const { data: callsInit } = await supabase
        .from('admin_calls')
        .select('id, caller_id, created_at, profiles!caller_id(name)')
        .eq('status', 'pending')
        .order('created_at');
      if (callsInit) {
        setPendingCalls(callsInit.map((c: any) => ({ ...c, caller_name: c.profiles?.name ?? '알 수 없음' })));
      }

      await refreshAgendas();

      // 채팅 Realtime
      chatCh = supabase.channel('admin-chat-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat' }, async (payload: { new: any }) => {
          const row = payload.new;
          const { data: p } = await supabase.from('profiles').select('name, role').eq('id', row.author_id).single();
          setMessages((prev: ChatMsg[]) => [...prev, { ...row, profile_name: p?.name ?? '알 수 없음', profile_role: p?.role ?? 'user' }]);
        })
        .subscribe();

      // 로그 Realtime
      logCh = supabase.channel('admin-log-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, async (payload: { new: any }) => {
          const row = payload.new;
          const { data: p } = await supabase.from('profiles').select('name').eq('id', row.admin_id).single();
          setLogs((prev: AdminLog[]) => [{ ...row, admin_name: p?.name ?? '알 수 없음' }, ...prev].slice(0, 30));
        })
        .subscribe();

      // 관리자 호출 Realtime
      callCh = supabase.channel('admin-call-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_calls' }, async (payload: { new: any }) => {
          const row = payload.new;
          if (row.status !== 'pending') return;
          const { data: p } = await supabase.from('profiles').select('name').eq('id', row.caller_id).single();
          setPendingCalls((prev: AdminCall[]) => [...prev, { ...row, caller_name: p?.name ?? '알 수 없음' }]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_calls' }, (payload: { new: any }) => {
          const row = payload.new;
          if (row.status !== 'pending') {
            setPendingCalls((prev: AdminCall[]) => prev.filter((c: AdminCall) => c.id !== row.id));
          }
        })
        .subscribe();

      // 버그 제보 초기 로드 + Realtime (Admin만)
      if (prof?.role === 'admin') {
        const { data: bugsInit } = await supabase
          .from('bug_reports')
          .select('id, title, description, category, created_at, resolved, profiles!reporter_id(name)')
          .order('created_at', { ascending: false })
          .limit(10);
        if (bugsInit) {
          setBugReports(bugsInit.map((b: any) => ({ ...b, reporter_name: b.profiles?.name ?? '알 수 없음', resolved: b.resolved ?? false })));
        }

        bugCh = supabase.channel('bug-report-stream')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bug_reports' }, async (payload: { new: any }) => {
            const row = payload.new;
            const { data: p } = await supabase.from('profiles').select('name').eq('id', row.reporter_id).single();
            setBugReports((prev: BugReport[]) => [{ ...row, reporter_name: p?.name ?? '알 수 없음', resolved: false }, ...prev].slice(0, 10));
          })
          .subscribe();
      }

      announceChRef.current = supabase.channel('global:announcements');
      announceChRef.current.subscribe();
    }

    init();
    return () => {
      if (chatCh)  supabase.removeChannel(chatCh);
      if (logCh)   supabase.removeChannel(logCh);
      if (callCh)  supabase.removeChannel(callCh);
      if (bugCh)   supabase.removeChannel(bugCh);
      if (announceChRef.current) supabase.removeChannel(announceChRef.current);
    };
  }, [supabase]);

  const refreshAgendas = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_with_votes')
      .select('id, title, category, is_open, yes_count, no_count, abstain_count, total_count')
      .order('display_order');
    if (data) setAgendas(data as AgendaRow[]);
  }, [supabase]);

  const getUserByName = useCallback(async (name: string) => {
    const { data } = await supabase.from('profiles').select('id, name').eq('name', name).single();
    return data as { id: string; name: string } | null;
  }, [supabase]);

  // ── 관리자 호출 참가 (race-condition safe) ────────────────────────
  const handleJoinCall = useCallback(async (call: AdminCall) => {
    if (!myProfile) return;
    const { data } = await supabase
      .from('admin_calls')
      .update({ status: 'active', responder_id: myProfile.id })
      .eq('id', call.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();
    if (!data) return;

    const { data: room } = await supabase
      .from('chat_rooms')
      .insert({ name: `${call.caller_name} 지원`, is_support: true, created_by: myProfile.id })
      .select('id')
      .single();
    if (!room) return;

    await supabase.from('chat_room_members').insert([
      { room_id: room.id, user_id: myProfile.id },
      { room_id: room.id, user_id: call.caller_id },
    ]);

    // 구독 후 broadcast — 미구독 상태에서 send하면 전달 안 될 수 있음
    await new Promise<void>(resolve => {
      const sigCh = supabase.channel(`support-signal:${call.caller_id}`);
      sigCh.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await sigCh.send({
            type: 'broadcast',
            event: 'support_ready',
            payload: { room_id: room.id },
          });
          resolve();
          setTimeout(() => supabase.removeChannel(sigCh), 1000);
        }
      });
    });

    setPipRoomId(room.id);
  }, [supabase, myProfile, setPipRoomId]);

  // ── 명령어 실행 (Admin 전용) ───────────────────────────────────────
  const executeCommand = useCallback(async (input: string) => {
    const cmd = parseCommand(input.trim());
    if (!cmd || !myProfile || !isAdmin) return false;

    if (cmd.type === 'kick' || cmd.type === 'ban') {
      const target = await getUserByName(cmd.name);
      if (!target) { alert(`"${cmd.name}" 유저를 찾을 수 없습니다.`); return false; }
      setConfirmModal({
        title: cmd.type === 'kick' ? `"${target.name}" 강제 로그아웃` : `"${target.name}" 영구 차단`,
        body: cmd.type === 'kick'
          ? `${target.name} 의원을 강제 로그아웃 처리하시겠습니까?\n세션이 즉시 종료됩니다.`
          : `${target.name} 의원을 영구 차단하시겠습니까?\n이 작업은 되돌리기 어렵습니다.`,
        onConfirm: async () => {
          if (cmd.type === 'kick') {
            await fetch('/api/admin/kick', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUserId: target.id }),
            });
            await supabase.channel(`user-control:${target.id}`).send({
              type: 'broadcast', event: 'force_signout', payload: { action: 'kick' },
            });
            await supabase.rpc('admin_kick_user', { p_user_id: target.id });
          } else {
            await supabase.rpc('admin_ban_user', { p_user_id: target.id });
            await supabase.channel(`user-control:${target.id}`).send({
              type: 'broadcast', event: 'force_signout', payload: { action: 'ban' },
            });
          }
        },
      });
      return true;
    }

    if (cmd.type === 'timeout') {
      const target = await getUserByName(cmd.name);
      if (!target) { alert(`"${cmd.name}" 유저를 찾을 수 없습니다.`); return false; }
      await supabase.rpc('admin_timeout_user', { p_user_id: target.id, p_seconds: cmd.seconds });
      return true;
    }

    if (cmd.type === 'announcement') {
      await supabase.from('announcements').insert({
        content: cmd.content,
        author: myProfile.name,
        admin_id: myProfile.id,
      });
      await announceChRef.current?.send({
        type: 'broadcast',
        event: 'new_announcement',
        payload: { id: new Date().toISOString(), content: cmd.content, author: myProfile.name, created_at: new Date().toISOString() },
      });
      return true;
    }

    return false;
  }, [supabase, myProfile, isAdmin, getUserByName]);

  // ── 채팅 전송 ─────────────────────────────────────────────────────
  const handleSend = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!chatInput.trim() || !myProfile || sending) return;
    setSending(true);
    setShowCmds(false);

    const isCmd = chatInput.trimStart().startsWith('/');
    if (isCmd) {
      if (!isAdmin) { alert('명령어는 Admin만 사용할 수 있습니다.'); setSending(false); return; }
      const handled = await executeCommand(chatInput);
      if (!handled) { alert('올바르지 않은 명령어 형식입니다.\n예: /announcement "내용"'); setSending(false); return; }
    }

    await supabase.from('admin_chat').insert({
      author_id: myProfile.id,
      content: chatInput.trim(),
      is_command: isCmd,
    });

    setChatInput('');
    setSending(false);
  }, [chatInput, myProfile, sending, isAdmin, executeCommand, supabase]);

  // ── 안건 개폐 ─────────────────────────────────────────────────────
  const toggleAgenda = useCallback(async (id: string, open: boolean) => {
    await supabase.rpc('admin_toggle_agenda', { p_agenda_id: id, p_open: open });
    await refreshAgendas();
  }, [supabase, refreshAgendas]);

  // ── 버그 제보 모달 열기 (전체 목록 fetch) ─────────────────────────
  const openBugModal = useCallback(async () => {
    setShowBugModal(true);
    setBugModalLoading(true);
    const { data } = await supabase
      .from('bug_reports')
      .select('id, title, description, category, created_at, resolved, profiles!reporter_id(name)')
      .order('created_at', { ascending: false });
    if (data) {
      setAllBugReports(data.map((b: any) => ({
        ...b,
        reporter_name: b.profiles?.name ?? '알 수 없음',
        resolved: b.resolved ?? false,
      })));
    }
    setBugModalLoading(false);
  }, [supabase]);

  // ── 버그 해결 토글 ────────────────────────────────────────────────
  const toggleBugResolved = useCallback(async (id: string, resolved: boolean) => {
    await supabase.from('bug_reports').update({ resolved }).eq('id', id);
    setAllBugReports((prev: BugReport[]) => prev.map((b: BugReport) => b.id === id ? { ...b, resolved } : b));
    setBugReports((prev: BugReport[]) => prev.map((b: BugReport) => b.id === id ? { ...b, resolved } : b));
  }, [supabase]);

  if (!myProfile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <>
      {/* 버그 제보 모달 */}
      {showBugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-dark-border shrink-0">
              <Bug size={16} className="text-red-primary dark:text-yellow-primary" />
              <span className="font-bold text-gray-800 dark:text-white flex-1">버그 제보 전체 목록</span>
              <button
                onClick={() => setShowBugModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bugModalLoading ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">로딩 중...</p>
              ) : allBugReports.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">제보 없음</p>
              ) : (
                allBugReports.map((bug: BugReport) => (
                  <div
                    key={bug.id}
                    className={cn(
                      'rounded-xl border px-4 py-3 space-y-1.5 transition-all',
                      bug.resolved
                        ? 'bg-gray-50 dark:bg-dark-bg border-gray-100 dark:border-dark-border opacity-60'
                        : 'bg-red-primary/5 border-red-primary/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={bug.resolved}
                        onChange={(e: { target: { checked: boolean } }) => toggleBugResolved(bug.id, e.target.checked)}
                        className="mt-0.5 shrink-0 accent-red-primary dark:accent-yellow-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-xs font-bold text-red-primary shrink-0', bug.resolved && 'line-through')}>
                            [{bug.category}]
                          </span>
                          <span className={cn('text-sm font-semibold text-gray-800 dark:text-gray-200', bug.resolved && 'line-through')}>
                            {bug.title}
                          </span>
                        </div>
                        <p className={cn('text-xs text-gray-500 dark:text-gray-400 leading-relaxed', bug.resolved && 'line-through')}>
                          {bug.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <span>{bug.reporter_name}</span>
                          <span>·</span>
                          <span>{fmt(bug.created_at)}</span>
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

      {/* 확인 모달 */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-primary mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{confirmModal.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-line">{confirmModal.body}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
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
                className="px-4 py-2 text-sm rounded-lg bg-red-primary hover:bg-red-hover text-white font-semibold transition-colors disabled:opacity-50"
              >
                {confirming ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">

        {/* ── 좌측: 실시간 접속자 목록 (Admin + Mod) ─────────────────── */}
        {(isAdmin || isMod) && (
          <aside className="w-60 shrink-0 border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col max-md:hidden">
            <div className="px-4 py-3.5 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <Users size={14} className="text-red-primary dark:text-yellow-primary" />
                접속자
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-400/20 text-green-600 dark:text-green-400 font-semibold">
                  {onlineCount}명
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-4 text-center">접속자 없음</p>
              ) : (
                <>
                  {adminUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-red-primary px-3 py-1 uppercase tracking-wider">Admin</p>
                      <div className="space-y-0.5">
                        {adminUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors">
                            <span className="w-2 h-2 rounded-full bg-red-primary shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {modUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-yellow-primary px-3 py-1 uppercase tracking-wider">Mod</p>
                      <div className="space-y-0.5">
                        {modUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors">
                            <span className="w-2 h-2 rounded-full bg-yellow-primary shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {regularUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-green-600 dark:text-green-400 px-3 py-1 uppercase tracking-wider">User</p>
                      <div className="space-y-0.5">
                        {regularUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors">
                            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{u.name}</span>
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

        {/* ── 중앙: 채팅 + 호출 알림 ────────────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-dark-border">
          <div className="px-4 py-3.5 border-b border-gray-200 dark:border-dark-border flex items-center gap-2 shrink-0">
            <Shield size={14} className="text-red-primary dark:text-yellow-primary" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {isAdmin ? '관리자 전용 채널' : 'Staff 채널'}
            </span>
            <span className="ml-auto text-xs text-gray-400">Private</span>
            {isMod && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-primary/10 text-yellow-primary font-semibold border border-yellow-primary/20">
                Mod
              </span>
            )}
            {isAdmin && (
              <button
                onClick={openBugModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-primary/10 text-red-primary hover:bg-red-primary/20 dark:bg-yellow-primary/10 dark:text-yellow-primary dark:hover:bg-yellow-primary/20 transition-colors"
              >
                <Bug size={12} />
                버그 제보
                {bugReports.filter((b: BugReport) => !b.resolved).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 text-xs font-bold min-w-[1.25rem] text-center leading-none">
                    {bugReports.filter((b: BugReport) => !b.resolved).length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 관리자 호출 알림 — 다수 동시 호출 대응 카드 목록 */}
          {(isAdmin || isMod) && pendingCalls.length > 0 && (
            <div className="border-b border-yellow-primary/20 bg-yellow-primary/5 shrink-0">
              <div className="px-4 pt-2.5 pb-1 flex items-center gap-2">
                <Bell size={13} className="text-yellow-primary animate-pulse" />
                <span className="text-xs font-bold text-yellow-primary">
                  관리자 호출 {pendingCalls.length}건 대기 중
                </span>
              </div>
              <div className="px-3 pb-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                {pendingCalls.map((call: AdminCall) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 bg-white dark:bg-dark-bg rounded-xl border border-yellow-primary/20 px-3 py-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-yellow-primary/15 flex items-center justify-center shrink-0">
                      <Bell size={12} className="text-yellow-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {call.caller_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fmt(call.created_at)} 호출</p>
                    </div>
                    <button
                      onClick={() => handleJoinCall(call)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-yellow-primary text-gray-900 font-bold hover:bg-yellow-hover transition-colors shrink-0"
                    >
                      참가하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메시지 목록 */}
          <div ref={msgPanelRef} onScroll={handleMsgScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-xs font-bold',
                    msg.is_command ? 'text-yellow-primary' : (ROLE_COLOR[msg.profile_role] ?? 'text-red-primary dark:text-yellow-primary')
                  )}>
                    {msg.profile_name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                  {msg.is_command && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-primary/10 text-yellow-primary font-mono">CMD</span>
                  )}
                </div>
                <p className={cn(
                  'text-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-lg',
                  msg.is_command
                    ? 'bg-yellow-primary/10 text-yellow-primary font-mono'
                    : 'bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-200'
                )}>
                  {msg.content}
                </p>
              </div>
            ))}
          </div>

          {/* 명령어 자동완성 (Admin only) */}
          {isAdmin && showCmds && (
            <div className="mx-4 mb-1 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-surface shadow-lg">
              {ADMIN_COMMANDS.filter((c) => c.startsWith(chatInput)).map((cmd) => (
                <button
                  key={cmd}
                  onMouseDown={() => { setChatInput(CMD_HINT[cmd] + ' '); setShowCmds(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-mono text-red-primary dark:text-yellow-primary hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors border-b last:border-0 border-gray-100 dark:border-dark-border"
                >
                  <span className="font-bold">{cmd}</span>
                  <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{CMD_HINT[cmd].slice(cmd.length)}</span>
                </button>
              ))}
            </div>
          )}

          {/* 입력창 */}
          <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-dark-border flex gap-2 shrink-0">
            <input
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                setShowCmds(isAdmin && e.target.value.startsWith('/'));
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowCmds(false); }}
              placeholder={isAdmin ? '메시지 또는 /명령어 "인자"' : '메시지를 입력하세요...'}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
        </section>

        {/* ── 우측: 스탯 + 안건관리 + 로그 (Admin only) ───────────────── */}
        {isAdmin && (
          <aside className="w-72 shrink-0 bg-gray-50 dark:bg-dark-surface flex flex-col overflow-hidden max-md:hidden">
            <div className="px-4 py-3.5 border-b border-gray-200 dark:border-dark-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <BarChart2 size={14} className="text-red-primary dark:text-yellow-primary" />
                현황 & 관리
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* 퀵 스탯 */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '접속 중', value: onlineCount, icon: '🟢' },
                  { label: '진행 안건', value: agendas.filter((a) => a.is_open).length, icon: '⚖️' },
                  { label: '총 투표수', value: agendas.reduce((s, a) => s + a.total_count, 0), icon: '🗳️' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 text-center">
                    <p className="text-xl font-extrabold text-red-primary dark:text-yellow-primary">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 안건 목록 */}
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">
                  안건 투표 관리
                </p>
                <div className="space-y-1.5">
                  {agendas.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 bg-white dark:bg-dark-bg rounded-xl border border-gray-100 dark:border-dark-border px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{a.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{a.total_count}표</p>
                      </div>
                      <button
                        onClick={() => toggleAgenda(a.id, !a.is_open)}
                        className={cn(
                          'shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                          a.is_open
                            ? 'bg-red-primary/10 text-red-primary hover:bg-red-primary/20'
                            : 'bg-green-400/10 text-green-600 dark:text-green-400 hover:bg-green-400/20'
                        )}
                      >
                        {a.is_open ? <><XCircle size={12} /> 마감</> : <><CheckCircle2 size={12} /> 개시</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 관리자 로그 */}
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">
                  관리자 로그
                </p>
                <div className="space-y-1.5">
                  {logs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">로그 없음</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex gap-2 text-xs bg-white dark:bg-dark-bg rounded-lg px-3 py-2 border border-gray-100 dark:border-dark-border">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">{fmt(log.created_at)}</span>
                        <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">{log.detail ?? log.action}</span>
                        <span className="text-red-primary dark:text-yellow-primary font-medium shrink-0">{log.admin_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 버그 제보 (Admin only) */}
              <div>
                <p className="text-xs font-bold text-red-primary uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                  <Bug size={11} />
                  버그 제보
                </p>
                <div className="space-y-1.5">
                  {bugReports.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">제보 없음</p>
                  ) : (
                    bugReports.map((bug: BugReport) => (
                      <div key={bug.id} className="rounded-xl bg-red-primary/5 border border-red-primary/20 px-3 py-2.5 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs font-bold text-red-primary shrink-0">[{bug.category}]</span>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{bug.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {bug.description}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{bug.reporter_name}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(bug.created_at)}</span>
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
