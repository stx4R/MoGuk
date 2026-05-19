'use client';

// 전역 PIP 채팅 창 — 슬래시 커맨드 + 파일 첨부 + 자동완성 S
import { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import FileDisplay from '@/components/chat/FileDisplay';
import { cn } from '@/utils/cn';

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', mod: 'Mod', user: 'User' };
const ROLE_COLOR: Record<string, string> = {
  admin: 'text-red-primary',
  mod:   'text-yellow-primary',
  user:  'text-green-600 dark:text-green-400',
};
const ROLE_RANK: Record<string, number> = { admin: 2, mod: 1, user: 0 };

const PIP_CMD_HINT: Record<string, string> = {
  '/end':          '/end',
  '/kick':         '/kick 사용자명',
  '/promote':      '/promote 사용자명',
  '/announcement': '/announcement 텍스트',
  '/leave':        '/leave',
};

type Message = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  is_system: boolean;
};

type MyProfile = { id: string; name: string; role: string };
type PIPMember = { user_id: string; name: string; role: string };

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export default function PIPChat() {
  const { pipRoomId, setPipRoomId } = usePIPChat();
  const [minimized, setMinimized]   = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [myProfile, setMyProfile]   = useState<MyProfile | null>(null);
  const [roomName, setRoomName]     = useState('');
  const [isSupport, setIsSupport]   = useState(false);
  const [isGlobal, setIsGlobal]     = useState(false);
  const [createdBy, setCreatedBy]   = useState<string | null>(null);
  const [roomMembers, setRoomMembers] = useState<PIPMember[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [pos, setPos]               = useState({ x: 0, y: 0 });
  const [promoteTarget, setPromoteTarget] = useState<PIPMember | null>(null);

  const draggingRef = useRef(false);
  const offsetRef   = useRef({ x: 0, y: 0 });
  const bottomRef   = useRef<HTMLDivElement>(null);
  const msgChRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase    = useRef(createClient()).current;

  const myRank     = ROLE_RANK[myProfile?.role ?? 'user'] ?? 0;
  const isCreator  = !!myProfile && createdBy === myProfile.id;
  const isReadOnly = isGlobal && myRank < 2;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // 내 프로필 로드 (한 번만)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase
        .from('profiles').select('id, name, role').eq('id', data.user.id).single();
      if (prof) setMyProfile(prof as MyProfile);
    });
  }, [supabase]);

  // 드래그 지원 S
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos({
        x: Math.max(0, Math.min(e.clientX - offsetRef.current.x, window.innerWidth - 320)),
        y: Math.max(0, Math.min(e.clientY - offsetRef.current.y, window.innerHeight - 48)),
      });
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // 방 변경 시 데이터 로드 + 실시간 구독
  useEffect(() => {
    if (!pipRoomId) {
      setMessages([]); setRoomName(''); setIsSupport(false);
      setIsGlobal(false); setCreatedBy(null); setRoomMembers([]);
      return;
    }

    let ch: ReturnType<typeof supabase.channel>;

    async function loadRoom() {
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('name, is_support, is_global, created_by')
        .eq('id', pipRoomId).single();
      if (room) {
        setRoomName(room.name);
        setIsSupport(room.is_support ?? false);
        setIsGlobal(room.is_global ?? false);
        setCreatedBy(room.created_by ?? null);
      }

      // kick/promote 커맨드용 멤버 목록
      const { data: members } = await supabase
        .from('chat_room_members')
        .select('user_id, profiles!user_id(name, role)')
        .eq('room_id', pipRoomId);
      if (members) {
        setRoomMembers(members.map((m: any) => ({
          user_id: m.user_id,
          name: m.profiles?.name ?? '알 수 없음',
          role: m.profiles?.role ?? 'user',
        })));
      }

      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, author_id, content, created_at, file_url, file_name, is_system, profiles!author_id(name, role)')
        .eq('room_id', pipRoomId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          ...m,
          author_name: m.profiles?.name ?? '알 수 없음',
          author_role: m.profiles?.role ?? 'user',
          file_url:    m.file_url  ?? null,
          file_name:   m.file_name ?? null,
          is_system:   m.is_system ?? false,
        })));
      }

      ch = supabase.channel(`pip-room:${pipRoomId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages',
          filter: `room_id=eq.${pipRoomId}`,
        }, async (payload) => {
          const row = payload.new as any;
          const { data: p } = await supabase.from('profiles').select('name, role').eq('id', row.author_id).single();
          setMessages(prev => [...prev, {
            ...row,
            author_name: p?.name ?? '알 수 없음',
            author_role: p?.role ?? 'user',
            file_url:    row.file_url  ?? null,
            file_name:   row.file_name ?? null,
            is_system:   row.is_system ?? false,
          }]);
        })
        .subscribe();
      msgChRef.current = ch;
    }

    loadRoom();
    setMinimized(false);
    setPos({ x: window.innerWidth - 336, y: window.innerHeight - 440 });
    return () => {
      msgChRef.current = null;
      if (ch) supabase.removeChannel(ch);
    };
  }, [pipRoomId, supabase]);

  // ── 커맨드 자동완성 ────────────────────────────────────────────────
  const availableCmds = (() => {
    const cmds: string[] = [];
    if (isSupport && myRank >= 1) cmds.push('/end');
    if (isCreator) cmds.push('/kick', '/promote', '/announcement');
    cmds.push('/leave');
    return cmds;
  })();

  const cmdSuggestions = (() => {
    if (!input.startsWith('/') || isReadOnly || !pipRoomId) return [];
    if (input.includes(' ')) return [];
    return availableCmds.filter(c => c.startsWith(input));
  })();

  // ── 메시지/커맨드 전송 ─────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !myProfile || !pipRoomId || sending) return;

    // /end — 지원방 종료 (Mod 이상)
    if (trimmed === '/end' && isSupport && myRank >= 1) {
      const { data: roomCheck } = await supabase
        .from('chat_rooms').select('is_support').eq('id', pipRoomId).single();
      if (!roomCheck?.is_support) { setInput(''); return; }
      await supabase.from('chat_messages').insert({
        room_id: pipRoomId, author_id: myProfile.id,
        content: '관리자가 지원을 종료했습니다.', is_system: true,
      });
      await supabase.from('chat_rooms').delete().eq('id', pipRoomId);
      setPipRoomId(null);
      setInput('');
      return;
    }

    // /kick — 멤버 강제 퇴장 (개설자 전용)
    if (trimmed.startsWith('/kick ') && isCreator) {
      const targetName = trimmed.slice(6).trim();
      const target = roomMembers.find(m => m.name === targetName);
      if (!target) { alert(`'${targetName}' 사용자를 멤버에서 찾을 수 없습니다.`); setInput(''); return; }
      if (target.role === 'admin') { alert('Admin은 강제 퇴장할 수 없습니다.'); setInput(''); return; }
      await supabase.from('chat_room_members').delete()
        .eq('room_id', pipRoomId).eq('user_id', target.user_id);
      await msgChRef.current?.send({
        type: 'broadcast', event: 'kick', payload: { user_id: target.user_id },
      });
      await supabase.from('chat_messages').insert({
        room_id: pipRoomId, author_id: myProfile.id,
        content: `${targetName}님이 강제 퇴장되었습니다.`, is_system: true,
      });
      setRoomMembers(prev => prev.filter(m => m.user_id !== target.user_id));
      setInput('');
      return;
    }

    // /announcement — 공지 설정 (개설자 전용)
    if (trimmed.startsWith('/announcement ') && isCreator) {
      const text = trimmed.slice(14).trim();
      if (!text) { setInput(''); return; }
      await supabase.from('chat_rooms').update({ announcement: text }).eq('id', pipRoomId);
      await msgChRef.current?.send({
        type: 'broadcast', event: 'announcement_update', payload: { text },
      });
      setInput('');
      return;
    }

    // /promote — 방장 양도 (개설자 전용)
    if (trimmed.startsWith('/promote ') && isCreator) {
      const targetName = trimmed.slice(9).trim();
      const target = roomMembers.find(m => m.name === targetName);
      if (!target) { alert(`'${targetName}' 사용자를 멤버에서 찾을 수 없습니다.`); setInput(''); return; }
      if (target.user_id === myProfile.id) { alert('자기 자신에게는 양도할 수 없습니다.'); setInput(''); return; }
      setPromoteTarget(target);
      setInput('');
      return;
    }

    // /leave — 방 나가기
    if (trimmed === '/leave') {
      await supabase.from('chat_room_members')
        .delete().eq('room_id', pipRoomId).eq('user_id', myProfile.id);
      setPipRoomId(null);
      setInput('');
      return;
    }

    setSending(true);
    await supabase.from('chat_messages').insert({
      room_id: pipRoomId, author_id: myProfile.id, content: trimmed,
    });
    setInput('');
    setSending(false);
  };

  const handlePromoteConfirm = async () => {
    if (!promoteTarget || !pipRoomId || !myProfile) return;
    await supabase.from('chat_rooms')
      .update({ created_by: promoteTarget.user_id }).eq('id', pipRoomId);
    await supabase.from('chat_messages').insert({
      room_id: pipRoomId, author_id: myProfile.id,
      content: `${promoteTarget.name}님이 새 방장이 되었습니다.`, is_system: true,
    });
    setCreatedBy(promoteTarget.user_id);
    setPromoteTarget(null);
  };

  if (!pipRoomId) return null;

  return (
    <>
      <div
        style={{ top: pos.y, left: pos.x }}
        className={cn(
          'fixed z-50 w-80 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface flex flex-col transition-all duration-200',
          minimized ? 'h-12' : 'h-[400px]'
        )}
      >
        {/* 헤더 */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-dark-border shrink-0 rounded-t-2xl bg-gray-50 dark:bg-dark-bg cursor-grab select-none"
          onMouseDown={(e) => {
            draggingRef.current = true;
            offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">{roomName || '채팅'}</span>
          <button
            onClick={() => setMinimized(v => !v)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
          >
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button
            onClick={() => setPipRoomId(null)}
            className="p-1 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {!minimized && (
          <>
            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {messages.map(msg =>
                msg.is_system ? (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-dark-bg px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <div key={msg.id} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn('text-xs font-bold', ROLE_COLOR[msg.author_role] ?? ROLE_COLOR.user)}>
                        [{ROLE_LABEL[msg.author_role] ?? msg.author_role}] {msg.author_name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                    </div>
                    {msg.file_url ? (
                      <FileDisplay filePath={msg.file_url} fileName={msg.file_name} compact />
                    ) : (
                      <p className="text-xs bg-gray-100 dark:bg-dark-bg rounded-lg rounded-tl-sm px-2.5 py-1.5 text-gray-700 dark:text-gray-300 break-words">
                        {msg.content}
                      </p>
                    )}
                  </div>
                )
              )}
              <div ref={bottomRef} />
            </div>

            {/* 커맨드 자동완성 힌트 S */}
            {cmdSuggestions.length > 0 && (
              <div className="mx-2 mb-1 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-bg shadow-lg shrink-0">
                {cmdSuggestions.map(cmd => (
                  <button
                    key={cmd}
                    type="button"
                    onMouseDown={() => setInput(PIP_CMD_HINT[cmd] ?? cmd)}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-red-primary dark:text-yellow-primary hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors border-b last:border-0 border-gray-100 dark:border-dark-border"
                  >
                    <span className="font-bold">{cmd}</span>
                    {(PIP_CMD_HINT[cmd]?.length ?? 0) > cmd.length && (
                      <span className="text-gray-400 dark:text-gray-500 ml-1.5">
                        {PIP_CMD_HINT[cmd].slice(cmd.length)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 입력창 */}
            {isReadOnly ? (
              <div className="p-2 border-t border-gray-100 dark:border-dark-border flex items-center justify-center shrink-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">📢 공지 채널</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="p-2 border-t border-gray-100 dark:border-dark-border flex gap-1.5 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && cmdSuggestions.length > 0) {
                      e.preventDefault();
                      setInput(PIP_CMD_HINT[cmdSuggestions[0]] ?? cmdSuggestions[0]);
                    }
                  }}
                  placeholder={
                    isCreator          ? '메시지 또는 /kick, /leave...' :
                    isSupport && myRank >= 1 ? '메시지 또는 /end, /leave' :
                    '메시지 또는 /leave...'
                  }
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="px-3 py-2 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40"
                >
                  <Send size={13} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* 방장 양도 확인 모달 */}
      {promoteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="font-bold text-gray-900 dark:text-white">방장 권한 양도</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-red-primary dark:text-yellow-primary">{promoteTarget.name}</span>
              님에게 방장 권한을 양도하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPromoteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handlePromoteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors"
              >
                양도
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
