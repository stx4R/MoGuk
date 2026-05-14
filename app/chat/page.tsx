'use client';

// 채팅 페이지 — 방 목록(좌) + 실시간 채팅(우) + 멤버 패널 + 파일 첨부 + 방 편집 S
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Send, MessageSquare, Lock, PictureInPicture2,
  X, Search, UserX, Users, Pencil, Paperclip,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import { useOnlineUsers } from '@/components/providers/OnlineUsersContext';
import { cn } from '@/utils/cn';

// ── Types ──────────────────────────────────────────────────────────
type Room = {
  id: string;
  name: string;
  icon: string | null;
  is_support: boolean;
  is_member: boolean;
  created_by: string | null;
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
};

type MyProfile = { id: string; name: string; role: string };
type SearchUser = { id: string; name: string; role: string };
type RoomMember = { user_id: string; name: string; role: string };

const ROLE_RANK: Record<string, number> = { admin: 2, mod: 1, user: 0 };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', mod: 'Mod', user: 'User' };
const ROLE_COLOR: Record<string, string> = {
  admin: 'text-red-primary',
  mod:   'text-yellow-primary',
  user:  'text-green-600 dark:text-green-400',
};
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-primary/10 text-red-primary border border-red-primary/30',
  mod:   'bg-yellow-primary/10 text-yellow-primary border border-yellow-primary/30',
  user:  'bg-green-400/10 text-green-600 dark:text-green-400 border border-green-400/30',
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const isImageFile = (name: string) =>
  IMAGE_EXTS.some(ext => name.toLowerCase().endsWith('.' + ext));

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function ChatPage() {
  const router      = useRouter();
  const supabase    = useRef(createClient()).current;
  const { setPipRoomId } = usePIPChat();
  const { onlineUsers }  = useOnlineUsers();

  const [myProfile, setMyProfile]         = useState<MyProfile | null>(null);
  const [rooms, setRooms]                 = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom]   = useState<Room | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [isDragging, setIsDragging]       = useState(false);

  // 방 생성 모달
  const [showCreate, setShowCreate]       = useState(false);
  const [newRoomName, setNewRoomName]     = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [inviteList, setInviteList]       = useState<SearchUser[]>([]);
  const [creating, setCreating]           = useState(false);

  // 멤버 패널
  const [showMembers, setShowMembers]     = useState(false);
  const [roomMembers, setRoomMembers]     = useState<RoomMember[]>([]);

  // 방 편집 모달 (개설자 전용)
  const [editingRoom, setEditingRoom]     = useState(false);
  const [editRoomName, setEditRoomName]   = useState('');
  const [editRoomIcon, setEditRoomIcon]   = useState('');

  const msgPanelRef   = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // ── 스크롤 제어 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = msgPanelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    isAtBottomRef.current = true;
    const el = msgPanelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedRoom?.id]);

  const handleMsgScroll = useCallback(() => {
    const el = msgPanelRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  // ── 초기 로드 ───────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: prof } = await supabase
        .from('profiles').select('id, name, role').eq('id', user.id).single();
      if (!prof) return;
      setMyProfile(prof as MyProfile);
      await loadRooms(user.id);
    }
    init();
  }, [supabase, router]);

  const loadRooms = useCallback(async (userId: string) => {
    const { data: memberRows } = await supabase
      .from('chat_room_members').select('room_id').eq('user_id', userId);
    const memberRoomIds = new Set((memberRows ?? []).map((r: any) => r.room_id));

    const { data: publicRooms } = await supabase
      .from('chat_rooms')
      .select('id, name, icon, is_support, created_by')
      .eq('is_public', true).order('created_at');

    const { data: privateRooms } = await supabase
      .from('chat_rooms')
      .select('id, name, icon, is_support, created_by')
      .eq('is_public', false)
      .in('id', Array.from(memberRoomIds)).order('created_at');

    const combined = [
      ...(publicRooms ?? []).map((r: any) => ({ ...r, icon: r.icon ?? null, created_by: r.created_by ?? null, is_member: memberRoomIds.has(r.id) })),
      ...(privateRooms ?? []).map((r: any) => ({ ...r, icon: r.icon ?? null, created_by: r.created_by ?? null, is_member: true })),
    ];
    setRooms(combined as Room[]);
  }, [supabase]);

  // ── 방 선택 → 메시지 로드 + 실시간 구독 ────────────────────────
  useEffect(() => {
    if (!selectedRoom) return;
    let msgCh:  ReturnType<typeof supabase.channel>;
    let roomCh: ReturnType<typeof supabase.channel>;

    async function load() {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, author_id, content, created_at, file_url, file_name, profiles!author_id(name, role)')
        .eq('room_id', selectedRoom!.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          ...m,
          author_name: m.profiles?.name ?? '알 수 없음',
          author_role: m.profiles?.role ?? 'user',
          file_url:    m.file_url  ?? null,
          file_name:   m.file_name ?? null,
        })));
      }

      // 채팅 메시지 실시간
      msgCh = supabase.channel(`chat-room:${selectedRoom!.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom!.id}`,
        }, async (payload: { new: any }) => {
          const row = payload.new as any;
          const { data: p } = await supabase.from('profiles').select('name, role').eq('id', row.author_id).single();
          setMessages((prev: Message[]) => [...prev, {
            ...row,
            author_name: p?.name  ?? '알 수 없음',
            author_role: p?.role  ?? 'user',
            file_url:    row.file_url  ?? null,
            file_name:   row.file_name ?? null,
          }]);
        })
        .subscribe();

      // 방 이름/아이콘 변경 실시간
      roomCh = supabase.channel(`chat-room-meta:${selectedRoom!.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'chat_rooms',
          filter: `id=eq.${selectedRoom!.id}`,
        }, (payload: { new: any }) => {
          const u = payload.new;
          setSelectedRoom(prev => prev ? { ...prev, name: u.name, icon: u.icon ?? null } : null);
          setRooms(prev => prev.map(r => r.id === u.id ? { ...r, name: u.name, icon: u.icon ?? null } : r));
        })
        .subscribe();
    }

    load();
    return () => {
      if (msgCh)  supabase.removeChannel(msgCh);
      if (roomCh) supabase.removeChannel(roomCh);
    };
  }, [selectedRoom?.id, supabase]);

  // ── 멤버 목록 로드 ───────────────────────────────────────────────
  const loadRoomMembers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('chat_room_members')
      .select('user_id, profiles!user_id(name, role)')
      .eq('room_id', roomId);
    if (data) {
      setRoomMembers(data.map((m: any) => ({
        user_id: m.user_id,
        name:    m.profiles?.name ?? '알 수 없음',
        role:    m.profiles?.role ?? 'user',
      })));
    }
  }, [supabase]);

  // ── 방 입장 ─────────────────────────────────────────────────────
  const joinAndSelect = useCallback(async (room: Room) => {
    if (!myProfile) return;
    if (!room.is_member) {
      await supabase.from('chat_room_members').insert({ room_id: room.id, user_id: myProfile.id });
      setRooms((prev: Room[]) => prev.map((r: Room) => r.id === room.id ? { ...r, is_member: true } : r));
    }
    setSelectedRoom({ ...room, is_member: true });
    setMessages([]);
    setShowMembers(false);
  }, [supabase, myProfile]);

  // ── 메시지 전송 ─────────────────────────────────────────────────
  const handleSend = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!input.trim() || !myProfile || !selectedRoom || sending) return;

    if (input.trim() === '/end' && selectedRoom.is_support) {
      const rank = ROLE_RANK[myProfile.role] ?? 0;
      if (rank >= 1) {
        await supabase.from('chat_messages').insert({
          room_id: selectedRoom.id, author_id: myProfile.id,
          content: '관리자가 지원을 종료했습니다.', is_system: true,
        });
        await supabase.from('chat_rooms').delete().eq('id', selectedRoom.id);
        setSelectedRoom(null);
        setMessages([]);
        if (myProfile) await loadRooms(myProfile.id);
        setInput('');
        return;
      }
    }

    setSending(true);
    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id,
      author_id: myProfile.id,
      content: input.trim(),
    });
    setInput('');
    setSending(false);
  }, [input, myProfile, selectedRoom, sending, supabase, loadRooms]);

  // ── 파일 업로드 ─────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    if (!myProfile || !selectedRoom || uploading) return;
    setUploading(true);
    const path = `${selectedRoom.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('chat-files').upload(path, file, { upsert: true });
    if (!data || error) {
      alert('파일 업로드 실패: ' + (error?.message ?? '알 수 없는 오류'));
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
    await supabase.from('chat_messages').insert({
      room_id:   selectedRoom.id,
      author_id: myProfile.id,
      content:   '',
      file_url:  urlData.publicUrl,
      file_name: file.name,
    });
    setUploading(false);
  }, [supabase, myProfile, selectedRoom, uploading]);

  // ── 방 편집 저장 ─────────────────────────────────────────────────
  const handleEditRoom = useCallback(async () => {
    if (!selectedRoom || !editRoomName.trim()) return;
    const newName = editRoomName.trim();
    const newIcon = editRoomIcon.trim() || null;
    await supabase.from('chat_rooms').update({ name: newName, icon: newIcon }).eq('id', selectedRoom.id);
    // 옵티미스틱 업데이트 — realtime이 나머지 구독자 업데이트
    setSelectedRoom(prev => prev ? { ...prev, name: newName, icon: newIcon } : null);
    setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, name: newName, icon: newIcon } : r));
    setEditingRoom(false);
  }, [supabase, selectedRoom, editRoomName, editRoomIcon]);

  // ── 유저 검색 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !myProfile) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id, name, role')
        .ilike('name', `%${searchQuery}%`).neq('id', myProfile.id).limit(8);
      setSearchResults((data as SearchUser[]) ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, myProfile, supabase]);

  const toggleInvite = (user: SearchUser) => {
    setInviteList(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  // ── 방 생성 ─────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim() || !myProfile || creating) return;
    setCreating(true);
    const { data: room, error: roomErr } = await supabase
      .from('chat_rooms')
      .insert({ name: newRoomName.trim(), is_public: false, created_by: myProfile.id })
      .select('id, name, icon, is_support, created_by').single();
    if (!room || roomErr) {
      alert(`채팅방 생성 실패: ${roomErr?.message ?? '알 수 없는 오류'}`);
      setCreating(false);
      return;
    }
    const members = [
      { room_id: room.id, user_id: myProfile.id },
      ...inviteList.map(u => ({ room_id: room.id, user_id: u.id })),
    ];
    const { error: memberErr } = await supabase.from('chat_room_members').insert(members);
    if (memberErr) {
      alert(`멤버 추가 실패: ${memberErr.message}`);
      setCreating(false);
      return;
    }
    const newRoom: Room = { ...room, is_member: true, icon: room.icon ?? null, created_by: room.created_by ?? null };
    setRooms(prev => [...prev, newRoom]);
    setSelectedRoom(newRoom);
    setMessages([]);
    setShowCreate(false);
    setNewRoomName('');
    setInviteList([]);
    setSearchQuery('');
    setCreating(false);
  }, [newRoomName, myProfile, inviteList, creating, supabase]);

  // ── 파생값 ──────────────────────────────────────────────────────
  const myRank      = ROLE_RANK[myProfile?.role ?? 'user'] ?? 0;
  const isCreator   = !!myProfile && selectedRoom?.created_by === myProfile.id;
  const onlineIds   = new Set(onlineUsers.map(u => u.user_id));

  const adminMembers = roomMembers.filter(m => m.role === 'admin');
  const modMembers   = roomMembers.filter(m => m.role === 'mod');
  const userMembers  = roomMembers.filter(m => m.role !== 'admin' && m.role !== 'mod');

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">

      {/* ── 좌측: 방 목록 ─────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col max-md:hidden">
        <div className="px-4 py-3.5 border-b border-gray-200 dark:border-dark-border flex items-center gap-2 shrink-0">
          <MessageSquare size={14} className="text-red-primary dark:text-yellow-primary" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1">채팅방</span>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-white dark:hover:bg-dark-bg transition-colors"
            title="새 채팅방 만들기"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {rooms.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">채팅방이 없습니다</p>
          ) : (
            rooms.map(room => (
              <button
                key={room.id}
                onClick={() => joinAndSelect(room)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors',
                  selectedRoom?.id === room.id
                    ? 'bg-red-primary/10 dark:bg-yellow-primary/10'
                    : room.is_member
                      ? 'hover:bg-white dark:hover:bg-dark-bg'
                      : 'opacity-50 hover:opacity-70 hover:bg-white dark:hover:bg-dark-bg'
                )}
              >
                {room.icon ? (
                  <span className="text-base shrink-0 leading-none">{room.icon}</span>
                ) : room.is_support ? (
                  <Lock size={13} className="text-yellow-primary shrink-0" />
                ) : (
                  <MessageSquare size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                )}
                <span className={cn(
                  'text-sm truncate flex-1',
                  selectedRoom?.id === room.id
                    ? 'font-semibold text-red-primary dark:text-yellow-primary'
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {room.name}
                </span>
                {!room.is_member && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">입장</span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── 우측: 채팅 영역 ────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0">
        {selectedRoom ? (
          <>
            {/* 헤더 */}
            <div className="px-4 py-3.5 border-b border-gray-200 dark:border-dark-border flex items-center gap-2 shrink-0 bg-white dark:bg-dark-bg">
              {selectedRoom.icon ? (
                <span className="text-base shrink-0 leading-none">{selectedRoom.icon}</span>
              ) : (
                <MessageSquare size={14} className="text-red-primary dark:text-yellow-primary" />
              )}
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1 truncate">
                {selectedRoom.name}
              </span>
              {selectedRoom.is_support && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-primary/10 text-yellow-primary border border-yellow-primary/20 font-medium shrink-0">
                  지원 채팅
                </span>
              )}
              {/* 방 편집 (개설자만) */}
              {isCreator && (
                <button
                  onClick={() => {
                    setEditRoomName(selectedRoom.name);
                    setEditRoomIcon(selectedRoom.icon ?? '');
                    setEditingRoom(true);
                  }}
                  title="채팅방 편집"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                >
                  <Pencil size={14} />
                </button>
              )}
              {/* 멤버 패널 토글 */}
              <button
                onClick={() => {
                  const next = !showMembers;
                  setShowMembers(next);
                  if (next) loadRoomMembers(selectedRoom.id);
                }}
                title="채팅방 멤버"
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  showMembers
                    ? 'text-red-primary dark:text-yellow-primary bg-gray-100 dark:bg-dark-surface'
                    : 'text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface'
                )}
              >
                <Users size={15} />
              </button>
              {/* PIP */}
              <button
                onClick={() => setPipRoomId(selectedRoom.id)}
                title="PIP 모드로 열기"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
              >
                <PictureInPicture2 size={15} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* 메시지 패널 (드래그&드롭 지원) */}
              <div
                ref={msgPanelRef}
                onScroll={handleMsgScroll}
                onDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e: any) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className={cn(
                  'flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-dark-bg relative transition-all',
                  isDragging && 'ring-2 ring-inset ring-red-primary dark:ring-yellow-primary'
                )}
              >
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-primary/5 dark:bg-yellow-primary/5 pointer-events-none z-10 rounded">
                    <p className="text-sm font-semibold text-red-primary dark:text-yellow-primary">
                      파일을 여기에 놓으세요
                    </p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-xs font-bold', ROLE_COLOR[msg.author_role] ?? ROLE_COLOR.user)}>
                        [{ROLE_LABEL[msg.author_role] ?? msg.author_role}] {msg.author_name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                    </div>
                    {msg.file_url ? (
                      isImageFile(msg.file_name ?? '') ? (
                        <img
                          src={msg.file_url}
                          alt={msg.file_name ?? '이미지'}
                          className="max-w-xs max-h-64 rounded-xl object-contain bg-gray-100 dark:bg-dark-surface"
                        />
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm text-red-primary dark:text-yellow-primary hover:underline max-w-xs"
                        >
                          <Paperclip size={13} />
                          {msg.file_name ?? '파일'}
                        </a>
                      )
                    ) : (
                      <p className="text-sm bg-gray-100 dark:bg-dark-surface rounded-xl rounded-tl-sm px-3 py-2 max-w-2xl text-gray-700 dark:text-gray-200">
                        {msg.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* 멤버 사이드 패널 */}
              {showMembers && (
                <aside className="w-56 shrink-0 border-l border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-dark-border shrink-0">
                    <Users size={13} className="text-red-primary dark:text-yellow-primary" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex-1">멤버</span>
                    <button
                      onClick={() => setShowMembers(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {[
                      { label: 'Admin',  members: adminMembers, color: 'text-red-primary' },
                      { label: 'Mod',    members: modMembers,   color: 'text-yellow-primary' },
                      { label: 'User',   members: userMembers,  color: 'text-green-600 dark:text-green-400' },
                    ].map(({ label, members, color }) =>
                      members.length > 0 && (
                        <div key={label}>
                          <p className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 px-1', color)}>
                            {label}
                          </p>
                          <div className="space-y-0.5">
                            {members.map(m => {
                              const isOnline = onlineIds.has(m.user_id);
                              return (
                                <div
                                  key={m.user_id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors"
                                >
                                  <span className={cn(
                                    'w-2 h-2 rounded-full shrink-0 animate-pulse',
                                    isOnline ? 'bg-green-400' : 'bg-red-400'
                                  )} />
                                  <span className={cn('text-xs flex-1 truncate', ROLE_COLOR[m.role] ?? ROLE_COLOR.user)}>
                                    {selectedRoom.created_by === m.user_id && '👑 '}
                                    {m.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                    {roomMembers.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">멤버 없음</p>
                    )}
                  </div>
                </aside>
              )}
            </div>

            {/* 입력창 */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-gray-200 dark:border-dark-border flex gap-2 shrink-0 bg-white dark:bg-dark-bg items-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e: any) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="파일 첨부"
                className="p-2.5 rounded-xl text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors disabled:opacity-40 shrink-0"
              >
                <Plus size={16} />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  uploading
                    ? '파일 업로드 중...'
                    : selectedRoom.is_support && myRank >= 1
                      ? '메시지 또는 /end 로 종료'
                      : '메시지를 입력하세요...'
                }
                disabled={uploading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || uploading}
                className="px-4 py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center bg-white dark:bg-dark-bg">
            <MessageSquare size={36} className="text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">채팅방을 선택하거나 새로 만드세요</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 px-4 py-2 text-sm font-semibold rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors"
            >
              새 채팅방 만들기
            </button>
          </div>
        )}
      </section>

      {/* ── 방 편집 모달 (개설자 전용) ──────────────────────────────── */}
      {editingRoom && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">채팅방 수정</h2>
              <button
                onClick={() => setEditingRoom(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">방 이름</label>
              <input
                value={editRoomName}
                onChange={e => setEditRoomName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                방 아이콘 (이모지, 선택)
              </label>
              <input
                value={editRoomIcon}
                onChange={e => setEditRoomIcon(e.target.value)}
                placeholder="예: 🎉  💬  📢  ⚖️"
                maxLength={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
              />
            </div>
            <button
              onClick={handleEditRoom}
              disabled={!editRoomName.trim()}
              className="w-full py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* ── 방 생성 모달 ────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">새 채팅방 만들기</h2>
              <button
                onClick={() => { setShowCreate(false); setNewRoomName(''); setInviteList([]); setSearchQuery(''); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">방 이름</label>
              <input
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="채팅방 이름을 입력하세요"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">참가자 초대</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="이름으로 검색..."
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-bg max-h-40 overflow-y-auto">
                  {searchResults.map(u => {
                    const targetRank = ROLE_RANK[u.role] ?? 0;
                    const cannotInvite = targetRank > myRank;
                    const isInvited = inviteList.some(i => i.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => !cannotInvite && toggleInvite(u)}
                        disabled={cannotInvite}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b last:border-0 border-gray-100 dark:border-dark-border transition-colors',
                          cannotInvite
                            ? 'opacity-50 cursor-not-allowed'
                            : isInvited
                              ? 'bg-red-primary/5 dark:bg-yellow-primary/5'
                              : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
                        )}
                      >
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-bold', ROLE_BADGE[u.role] ?? ROLE_BADGE.user)}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{u.name}</span>
                        {cannotInvite ? (
                          <span className="text-xs text-gray-400 flex items-center gap-1"><UserX size={12} /> 초대 불가</span>
                        ) : isInvited ? (
                          <span className="text-xs text-red-primary dark:text-yellow-primary font-semibold">✓ 선택됨</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {inviteList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inviteList.map(u => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-primary/10 dark:bg-yellow-primary/10 text-red-primary dark:text-yellow-primary font-medium"
                    >
                      {u.name}
                      <button onClick={() => toggleInvite(u)} className="hover:opacity-70"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim() || creating}
              className="w-full py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40"
            >
              {creating ? '생성 중...' : '채팅방 만들기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
