'use client';

// 전역 PIP 채팅 창 — 어느 탭에서도 하단 우측에 표시 S
import { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import { cn } from '@/utils/cn';

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', mod: 'Mod', user: 'User' };
const ROLE_COLOR: Record<string, string> = {
  admin: 'text-red-primary',
  mod:   'text-yellow-primary',
  user:  'text-green-600 dark:text-green-400',
};

type Message = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
};

type MyProfile = { id: string; name: string; role: string };

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export default function PIPChat() {
  const { pipRoomId, setPipRoomId } = usePIPChat();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [roomName, setRoomName]   = useState('');
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase  = useRef(createClient()).current;

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

  // 방 변경 시 메시지 로드 + 실시간 구독
  useEffect(() => {
    if (!pipRoomId) { setMessages([]); setRoomName(''); return; }

    let ch: ReturnType<typeof supabase.channel>;

    async function loadRoom() {
      const { data: room } = await supabase
        .from('chat_rooms').select('name').eq('id', pipRoomId).single();
      if (room) setRoomName(room.name);

      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, author_id, content, created_at, profiles!author_id(name, role)')
        .eq('room_id', pipRoomId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          ...m,
          author_name: m.profiles?.name ?? '알 수 없음',
          author_role: m.profiles?.role ?? 'user',
        })));
      }

      ch = supabase.channel(`pip-room:${pipRoomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${pipRoomId}` }, async (payload) => {
          const row = payload.new as any;
          const { data: p } = await supabase.from('profiles').select('name, role').eq('id', row.author_id).single();
          setMessages(prev => [...prev, {
            ...row,
            author_name: p?.name ?? '알 수 없음',
            author_role: p?.role ?? 'user',
          }]);
        })
        .subscribe();
    }

    loadRoom();
    setMinimized(false);
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [pipRoomId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !myProfile || !pipRoomId || sending) return;
    setSending(true);
    await supabase.from('chat_messages').insert({
      room_id: pipRoomId,
      author_id: myProfile.id,
      content: input.trim(),
    });
    setInput('');
    setSending(false);
  };

  if (!pipRoomId) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-80 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface flex flex-col transition-all duration-200',
        minimized ? 'h-12' : 'h-96'
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-dark-border shrink-0 rounded-t-2xl bg-gray-50 dark:bg-dark-bg">
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-xs font-bold', ROLE_COLOR[msg.author_role] ?? ROLE_COLOR.user)}>
                    [{ROLE_LABEL[msg.author_role] ?? msg.author_role}] {msg.author_name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                </div>
                <p className="text-xs bg-gray-100 dark:bg-dark-bg rounded-lg rounded-tl-sm px-2.5 py-1.5 text-gray-700 dark:text-gray-300">
                  {msg.content}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <form onSubmit={handleSend} className="p-2 border-t border-gray-100 dark:border-dark-border flex gap-1.5 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
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
        </>
      )}
    </div>
  );
}
