'use client';

// 채팅 페이지 — 방 목록(좌) + 실시간 채팅(우) + 멤버 패널 + 파일 첨부 + 방 편집 + 특수방 + 킥/공지 S
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Send, MessageSquare, Lock, PictureInPicture2,
  X, Search, UserX, Users, Pencil, ChevronLeft, UserPlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import FileDisplay from '@/components/chat/FileDisplay';
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
  is_global: boolean;
  party_tag: string | null;
  announcement: string | null;
};

type Message = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_pp: string;
  content: string;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  is_system: boolean;
};

type MyProfile = { id: string; name: string; role: string; pp: string };
type SearchUser = { id: string; name: string; role: string };
type RoomMember = { user_id: string; name: string; role: string; pp: string };

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

const PP_BADGE: Record<string, string> = {
  '진보':   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  '보수':   'bg-red-primary/15 text-red-primary border border-red-primary/30',
  '중도':   'bg-yellow-primary/15 text-yellow-primary border border-yellow-primary/30',
  '무소속': 'bg-gray-400/15 text-gray-500 dark:text-gray-400 border border-gray-400/30',
};

const PARTY_LEADERS: Record<string, string> = { '진보': '김동하', '보수': '정재욱', '중도': '황성연' };

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// 커맨드 자동완성 힌트 S
const CHAT_CMD_HINT: Record<string, string> = {
  '/end':          '/end',
  '/kick':         '/kick 사용자명',
  '/promote':      '/promote 사용자명',
  '/announcement': '/announcement 텍스트',
  '/leave':        '/leave',
};

// NM-3: 파일 매직 바이트 검증 S
async function checkMagicBytes(file: File): Promise<boolean> {
  const buf   = await file.slice(0, 12).arrayBuffer();
  const b     = new Uint8Array(buf);
  const type  = file.type;
  if (type === 'image/jpeg')       return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  if (type === 'image/png')        return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  if (type === 'image/gif')        return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  if (type === 'image/webp')       return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
                                       && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  if (type === 'image/avif')       return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
  if (type === 'application/pdf')  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  // S-2 fix: text/plain도 실행파일 매직바이트 블랙리스트 검사
  if (type === 'text/plain') {
    const isMZ    = b[0] === 0x4D && b[1] === 0x5A;                                     // Windows PE
    const isELF   = b[0] === 0x7F && b[1] === 0x45 && b[2] === 0x4C && b[3] === 0x46;  // Linux ELF
    const isShebang = b[0] === 0x23 && b[1] === 0x21;                                   // #!/...
    return !isMZ && !isELF && !isShebang;
  }
  return false;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function ChatPage() {
  const router           = useRouter();
  const supabase         = useRef(createClient()).current;
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
  const [mobileView, setMobileView]       = useState<'rooms' | 'chat'>('rooms');
  const [announcementPopup, setAnnouncementPopup] = useState(false);

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

  // 초대 모달 (채팅방 생성 후) S
  const [showInviteModal, setShowInviteModal]   = useState(false);
  const [inviteQuery, setInviteQuery]           = useState('');
  const [inviteResults, setInviteResults]       = useState<SearchUser[]>([]);
  const [pendingInvites, setPendingInvites]     = useState<SearchUser[]>([]);
  const [inviting, setInviting]                 = useState(false);

  // 방장 양도 확인 모달
  const [promoteTarget, setPromoteTarget] = useState<RoomMember | null>(null);

  const msgPanelRef   = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const msgChRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myUserIdRef   = useRef<string | null>(null);

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

  // ── 특수방 자동 멤버십 ───────────────────────────────────────────
  const ensureSpecialMembership = useCallback(async (
    userId: string, userName: string, userPp: string
  ) => {
    // 특수방 없으면 서버에서 자동 생성 S
    let globalRoomId: string | null = null;
    let partyRoomIds: Record<string, string> = {};
    try {
      const res = await fetch('/api/ensure-special-rooms', { method: 'POST' });
      if (res.ok) ({ globalRoomId, partyRoomIds } = await res.json());
    } catch { /* API 오류 시 아래 DB 조회로 fallback */ }

    // 전체 공지방 자동 가입
    const gRoomId = globalRoomId ?? (await supabase
      .from('chat_rooms').select('id').eq('is_global', true).maybeSingle()).data?.id ?? null;
    if (gRoomId) {
      await supabase.from('chat_room_members').insert({ room_id: gRoomId, user_id: userId });
    }

    // 정당별 채팅방 자동 가입
    if (userPp && userPp !== '무소속') {
      const pRoomId = partyRoomIds[userPp] ?? (await supabase
        .from('chat_rooms').select('id').eq('party_tag', userPp).maybeSingle()).data?.id ?? null;
      if (pRoomId) {
        await supabase.from('chat_room_members').insert({ room_id: pRoomId, user_id: userId });
        // 정당 개설자 자동 설정 (처음 가입 시)
        const { data: partyRoom } = await supabase
          .from('chat_rooms').select('created_by').eq('id', pRoomId).single();
        if (!partyRoom?.created_by && userName === PARTY_LEADERS[userPp]) {
          await supabase.from('chat_rooms').update({ created_by: userId }).eq('id', pRoomId);
        }
      }
    }
  }, [supabase]);

  // ── 방 목록 로드 ─────────────────────────────────────────────────
  const loadRooms = useCallback(async (userId: string) => {
    const { data: memberRows } = await supabase
      .from('chat_room_members').select('room_id').eq('user_id', userId);
    const memberRoomIds = new Set((memberRows ?? []).map((r: any) => r.room_id));

    const { data: publicRooms } = await supabase
      .from('chat_rooms')
      .select('id, name, icon, is_support, created_by, is_global, party_tag, announcement')
      .eq('is_public', true).order('created_at');

    const memberIdArray = Array.from(memberRoomIds);
    let privateRoomsData: any[] = [];
    if (memberIdArray.length > 0) {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, icon, is_support, created_by, is_global, party_tag, announcement')
        .eq('is_public', false)
        .in('id', memberIdArray)
        .order('created_at');
      privateRoomsData = data ?? [];
    }

    const toRoom = (r: any, isMember: boolean): Room => ({
      id: r.id, name: r.name,
      icon: r.icon ?? null,
      is_support: r.is_support ?? false,
      created_by: r.created_by ?? null,
      is_global: r.is_global ?? false,
      party_tag: r.party_tag ?? null,
      announcement: r.announcement ?? null,
      is_member: isMember,
    });

    const combined = [
      ...(publicRooms ?? []).map((r: any) => toRoom(r, memberRoomIds.has(r.id))),
      ...privateRoomsData.map((r: any) => toRoom(r, true)),
    ];
    setRooms(combined);
  }, [supabase]);

  // ── 초기 로드 (INITIAL_SESSION + SIGNED_IN 양쪽 처리로 타이밍 문제 방어) ─────────────
  useEffect(() => {
    let initialized = false;

    const initPage = async (session: any) => {
      if (initialized) return;
      initialized = true;
      myUserIdRef.current = session.user.id;
      const { data: prof } = await supabase
        .from('profiles').select('id, name, role, pp').eq('id', session.user.id).single();
      if (!prof) return;
      setMyProfile(prof as MyProfile);
      await ensureSpecialMembership(session.user.id, (prof as any).name, (prof as any).pp ?? '무소속');
      await loadRooms(session.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') { router.push('/login'); return; }
        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
        if (!session) { if (event === 'INITIAL_SESSION') router.push('/login'); return; }
        await initPage(session);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, router, ensureSpecialMembership, loadRooms]);

  // PP 변경 감지 → 방 목록 새로고침 (DB 트리거가 멤버십 교체, 프론트엔드는 UI 갱신) S
  useEffect(() => {
    if (!myProfile?.id) return;
    const userId = myProfile.id;
    const ch = supabase.channel(`profile-watch:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `id=eq.${userId}`,
      }, async (payload: any) => {
        const newPp: string = (payload.new as any)?.pp ?? '무소속';
        setMyProfile(prev => prev ? { ...prev, pp: newPp } : null);
        await loadRooms(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myProfile?.id, supabase, loadRooms]);

  // ── 방 선택 → 메시지 로드 + 실시간 구독 ────────────────────────
  useEffect(() => {
    if (!selectedRoom) return;
    let msgCh:  ReturnType<typeof supabase.channel>;
    let roomCh: ReturnType<typeof supabase.channel>;

    async function load() {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, author_id, content, created_at, file_url, file_name, is_system, profiles!author_id(name, role, pp)')
        .eq('room_id', selectedRoom!.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          ...m,
          author_name: m.profiles?.name ?? '알 수 없음',
          author_role: m.profiles?.role ?? 'user',
          author_pp:   m.profiles?.pp   ?? '무소속',
          file_url:    m.file_url  ?? null,
          file_name:   m.file_name ?? null,
          is_system:   m.is_system ?? false,
        })));
      }

      // 채팅 메시지 실시간 + 킥/공지 브로드캐스트
      msgCh = supabase.channel(`chat-room:${selectedRoom!.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom!.id}`,
        }, async (payload: { new: any }) => {
          const row = payload.new as any;
          const { data: p } = await supabase
            .from('profiles').select('name, role, pp').eq('id', row.author_id).single();
          setMessages((prev: Message[]) => [...prev, {
            ...row,
            author_name: p?.name  ?? '알 수 없음',
            author_role: p?.role  ?? 'user',
            author_pp:   (p as any)?.pp ?? '무소속',
            file_url:    row.file_url  ?? null,
            file_name:   row.file_name ?? null,
            is_system:   row.is_system ?? false,
          }]);
        })
        .on('broadcast', { event: 'kick' }, ({ payload }: { payload: { user_id: string } }) => {
          if (payload.user_id === myUserIdRef.current) {
            // H-4 fix: DB에서 실제 멤버십 제거 여부 확인 후 처리 (broadcast 위조 방어) S
            const roomId = selectedRoom!.id;
            supabase.from('chat_room_members')
              .select('user_id').eq('room_id', roomId).eq('user_id', myUserIdRef.current!).single()
              .then(({ data }) => {
                if (!data) {
                  setSelectedRoom(null);
                  setMessages([]);
                  setMobileView('rooms');
                  alert('채팅방에서 강제 퇴장되었습니다.');
                }
              });
          } else {
            setRoomMembers(prev => prev.filter(m => m.user_id !== payload.user_id));
          }
        })
        .on('broadcast', { event: 'announcement_update' }, async () => {
          // S-1 fix: broadcast payload 신뢰 금지 — DB에서 실제 값 재조회 (위조 방어)
          const { data } = await supabase
            .from('chat_rooms').select('announcement').eq('id', selectedRoom!.id).single();
          if (data !== undefined) {
            setSelectedRoom(prev => prev ? { ...prev, announcement: data?.announcement ?? null } : null);
          }
        })
        .subscribe();

      msgChRef.current = msgCh;

      // 방 이름/아이콘/공지 변경 실시간
      roomCh = supabase.channel(`chat-room-meta:${selectedRoom!.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'chat_rooms',
          filter: `id=eq.${selectedRoom!.id}`,
        }, (payload: { new: any }) => {
          const u = payload.new;
          setSelectedRoom(prev => prev
            ? { ...prev, name: u.name, icon: u.icon ?? null, announcement: u.announcement ?? null, created_by: u.created_by ?? null }
            : null
          );
          setRooms(prev => prev.map(r => r.id === u.id
            ? { ...r, name: u.name, icon: u.icon ?? null, announcement: u.announcement ?? null, created_by: u.created_by ?? null }
            : r
          ));
        })
        .subscribe();
    }

    load();
    return () => {
      msgChRef.current = null;
      if (msgCh)  supabase.removeChannel(msgCh);
      if (roomCh) supabase.removeChannel(roomCh);
    };
  }, [selectedRoom?.id, supabase]);

  // ── 멤버 목록 로드 ───────────────────────────────────────────────
  const loadRoomMembers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('chat_room_members')
      .select('user_id, profiles!user_id(name, role, pp)')
      .eq('room_id', roomId);
    if (data) {
      setRoomMembers(data.map((m: any) => ({
        user_id: m.user_id,
        name:    m.profiles?.name ?? '알 수 없음',
        role:    m.profiles?.role ?? 'user',
        pp:      m.profiles?.pp   ?? '무소속',
      })));
    }
  }, [supabase]);

  // ── 방 입장 ─────────────────────────────────────────────────────
  const joinAndSelect = useCallback(async (room: Room) => {
    if (!myProfile) return;
    if (!room.is_member) {
      await supabase.from('chat_room_members').insert({ room_id: room.id, user_id: myProfile.id });
      setRooms((prev: Room[]) => prev.map((r: Room) =>
        r.id === room.id ? { ...r, is_member: true } : r
      ));
    }
    setSelectedRoom({ ...room, is_member: true });
    setMessages([]);
    setShowMembers(false);
    setMobileView('chat');
    setAnnouncementPopup(false);
    await loadRoomMembers(room.id);
  }, [supabase, myProfile, loadRoomMembers]);

  // ── 메시지 전송 ─────────────────────────────────────────────────
  const handleSend = useCallback(async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !myProfile || !selectedRoom || sending) return;

    const _isCreator = selectedRoom.created_by === myProfile.id;

    // /end 커맨드 (지원방 종료, Mod 이상)
    if (trimmed === '/end' && selectedRoom.is_support) {
      const rank = ROLE_RANK[myProfile.role] ?? 0;
      if (rank >= 1) {
        // M-2 fix: 클라이언트 상태 조작 방어 — DB에서 is_support 재확인 S
        const { data: roomCheck } = await supabase
          .from('chat_rooms').select('is_support').eq('id', selectedRoom.id).single();
        if (!roomCheck?.is_support) { setInput(''); return; }
        await supabase.from('chat_messages').insert({
          room_id: selectedRoom.id, author_id: myProfile.id,
          content: '관리자가 지원을 종료했습니다.', is_system: true,
        });
        await supabase.from('chat_rooms').delete().eq('id', selectedRoom.id);
        setSelectedRoom(null);
        setMessages([]);
        setMobileView('rooms');
        await loadRooms(myProfile.id);
        setInput('');
        return;
      }
    }

    // /kick 커맨드 (개설자 전용)
    if (trimmed.startsWith('/kick ') && _isCreator) {
      const targetName = trimmed.slice(6).trim();
      const targetMember = roomMembers.find(m => m.name === targetName);
      if (!targetMember) {
        alert(`'${targetName}' 사용자를 채팅방 멤버에서 찾을 수 없습니다.`);
        setInput('');
        return;
      }
      // H-5 fix: Admin은 kick 불가 (권한 역전 방지) S
      if (targetMember.role === 'admin') {
        alert('Admin 사용자는 강제 퇴장할 수 없습니다.');
        setInput('');
        return;
      }
      await supabase.from('chat_room_members').delete()
        .eq('room_id', selectedRoom.id).eq('user_id', targetMember.user_id);
      await msgChRef.current?.send({
        type: 'broadcast', event: 'kick',
        payload: { user_id: targetMember.user_id },
      });
      await supabase.from('chat_messages').insert({
        room_id: selectedRoom.id, author_id: myProfile.id,
        content: `${targetName}님이 강제 퇴장되었습니다.`, is_system: true,
      });
      setRoomMembers(prev => prev.filter(m => m.user_id !== targetMember.user_id));
      setInput('');
      return;
    }

    // /announcement 커맨드 (개설자 전용)
    if (trimmed.startsWith('/announcement ') && _isCreator) {
      const text = trimmed.slice(14).trim();
      if (!text) { setInput(''); return; }
      if (text.length > 500) { alert('공지는 500자 이하여야 합니다.'); return; }
      await supabase.from('chat_rooms').update({ announcement: text }).eq('id', selectedRoom.id);
      await msgChRef.current?.send({
        type: 'broadcast', event: 'announcement_update',
        payload: { text },
      });
      setSelectedRoom(prev => prev ? { ...prev, announcement: text } : null);
      setInput('');
      return;
    }

    // /promote 커맨드 (개설자 전용) S
    if (trimmed.startsWith('/promote ') && _isCreator) {
      const targetName = trimmed.slice(9).trim();
      const targetMember = roomMembers.find(m => m.name === targetName);
      if (!targetMember) {
        alert(`'${targetName}' 사용자를 채팅방 멤버에서 찾을 수 없습니다.`);
        setInput('');
        return;
      }
      if (targetMember.user_id === myProfile.id) {
        alert('자기 자신에게는 방장 권한을 양도할 수 없습니다.');
        setInput('');
        return;
      }
      setPromoteTarget(targetMember);
      setInput('');
      return;
    }

    // /leave 커맨드 — 현재 방 나가기 S
    if (trimmed === '/leave') {
      await supabase.from('chat_room_members')
        .delete().eq('room_id', selectedRoom.id).eq('user_id', myProfile.id);
      setSelectedRoom(null);
      setMessages([]);
      setMobileView('rooms');
      await loadRooms(myProfile.id);
      setInput('');
      return;
    }

    setSending(true);
    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id,
      author_id: myProfile.id,
      content: trimmed,
    });
    setInput('');
    setSending(false);
  }, [input, myProfile, selectedRoom, sending, supabase, loadRooms, roomMembers]);

  // 방장 양도 확정 S
  const handlePromoteConfirm = useCallback(async () => {
    if (!promoteTarget || !selectedRoom || !myProfile) return;
    await supabase.from('chat_rooms')
      .update({ created_by: promoteTarget.user_id }).eq('id', selectedRoom.id);
    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id, author_id: myProfile.id,
      content: `${promoteTarget.name}님이 새 방장이 되었습니다.`, is_system: true,
    });
    setSelectedRoom(prev => prev ? { ...prev, created_by: promoteTarget.user_id } : null);
    setPromoteTarget(null);
  }, [promoteTarget, selectedRoom, myProfile, supabase]);

  // ── 파일 업로드 ─────────────────────────────────────────────────
  const UPLOAD_MAX_BYTES  = 10 * 1024 * 1024;
  const UPLOAD_MIME_ALLOW = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'application/pdf', 'text/plain',
  ]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!myProfile || !selectedRoom || uploading) return;
    if (file.size > UPLOAD_MAX_BYTES) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!UPLOAD_MIME_ALLOW.has(file.type)) {
      alert('허용되지 않는 파일 형식입니다. (이미지, PDF, TXT만 가능)');
      return;
    }
    // NM-3: 매직 바이트 검증 S
    if (!await checkMagicBytes(file)) {
      alert('파일 내용이 확장자와 일치하지 않습니다.');
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${selectedRoom.id}/${Date.now()}_${safeName}`;
    const { data, error } = await supabase.storage
      .from('chat-files').upload(path, file, { upsert: true });
    if (!data || error) {
      alert('파일 업로드 실패: ' + (error?.message ?? '알 수 없는 오류'));
      setUploading(false);
      return;
    }
    // M-2: Storage 경로만 저장 — FileDisplay가 렌더 시 서명 URL 생성 S
    await supabase.from('chat_messages').insert({
      room_id:   selectedRoom.id,
      author_id: myProfile.id,
      content:   '',
      file_url:  data.path,
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

  // 초대 모달 유저 검색 S
  useEffect(() => {
    if (!inviteQuery.trim() || !myProfile) { setInviteResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id, name, role')
        .ilike('name', `%${inviteQuery}%`).neq('id', myProfile.id).limit(8);
      setInviteResults((data as SearchUser[]) ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteQuery, myProfile, supabase]);

  const toggleInvite = (user: SearchUser) => {
    setInviteList(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const togglePendingInvite = (user: SearchUser) => {
    setPendingInvites(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  // 채팅방 생성 후 사용자 초대 S
  const handleInviteUsers = useCallback(async () => {
    if (!selectedRoom || !pendingInvites.length || inviting) return;
    setInviting(true);
    const existingIds = new Set(roomMembers.map(m => m.user_id));
    const rows = pendingInvites
      .filter(u => !existingIds.has(u.id))
      .map(u => ({ room_id: selectedRoom.id, user_id: u.id }));
    if (rows.length) await supabase.from('chat_room_members').insert(rows);
    await loadRoomMembers(selectedRoom.id);
    setShowInviteModal(false);
    setPendingInvites([]);
    setInviteQuery('');
    setInviteResults([]);
    setInviting(false);
  }, [selectedRoom, pendingInvites, inviting, supabase, loadRoomMembers, roomMembers]);

  // ── 방 생성 ─────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim() || !myProfile || creating) return;
    if (newRoomName.trim().length > 50) { alert('방 이름은 50자 이하여야 합니다.'); return; }
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
    const newRoom: Room = {
      ...room,
      is_member: true,
      icon: room.icon ?? null,
      created_by: room.created_by ?? null,
      is_global: false,
      party_tag: null,
      announcement: null,
    };
    setRooms(prev => [...prev, newRoom]);
    setSelectedRoom(newRoom);
    setMessages([]);
    setShowCreate(false);
    setNewRoomName('');
    setInviteList([]);
    setSearchQuery('');
    setCreating(false);
    setMobileView('chat');
  }, [newRoomName, myProfile, inviteList, creating, supabase]);

  // ── 파생값 ──────────────────────────────────────────────────────
  const myRank     = ROLE_RANK[myProfile?.role ?? 'user'] ?? 0;
  const isCreator  = !!myProfile && selectedRoom?.created_by === myProfile.id;
  const onlineIds  = new Set(onlineUsers.map(u => u.user_id));
  const isReadOnly = (selectedRoom?.is_global === true) && myProfile?.role !== 'admin';

  const availableCmds = (() => {
    const cmds: string[] = [];
    if (selectedRoom?.is_support && myRank >= 1) cmds.push('/end');
    if (isCreator) cmds.push('/kick', '/promote', '/announcement');
    cmds.push('/leave');
    return cmds;
  })();
  const cmdSuggestions = (() => {
    if (!input.startsWith('/') || isReadOnly || !selectedRoom) return [];
    if (input.includes(' ')) return [];
    return availableCmds.filter(c => c.startsWith(input));
  })();

  const adminMembers = roomMembers.filter(m => m.role === 'admin');
  const modMembers   = roomMembers.filter(m => m.role === 'mod');
  const userMembers  = roomMembers.filter(m => m.role !== 'admin' && m.role !== 'mod');

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">

      {/* ── 좌측: 방 목록 ─────────────────────────────────────────── */}
      <aside className={cn(
        'shrink-0 border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col',
        'md:w-64',
        mobileView === 'rooms' ? 'w-full flex' : 'hidden md:flex',
      )}>
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
      <section className={cn(
        'flex-1 flex flex-col min-w-0',
        mobileView === 'chat' ? 'flex' : 'hidden md:flex',
      )}>
        {selectedRoom ? (
          <>
            {/* 헤더 */}
            <div className="px-3 py-3.5 border-b border-gray-200 dark:border-dark-border flex items-center gap-1.5 shrink-0 bg-white dark:bg-dark-bg">
              {/* 모바일 뒤로가기 */}
              <button
                onClick={() => setMobileView('rooms')}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors shrink-0"
              >
                <ChevronLeft size={18} />
              </button>
              {selectedRoom.icon ? (
                <span className="text-base shrink-0 leading-none">{selectedRoom.icon}</span>
              ) : (
                <MessageSquare size={14} className="text-red-primary dark:text-yellow-primary shrink-0" />
              )}
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1 truncate min-w-0">
                {selectedRoom.name}
              </span>
              {selectedRoom.is_support && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-primary/10 text-yellow-primary border border-yellow-primary/20 font-medium shrink-0">
                  지원
                </span>
              )}
              {selectedRoom.is_global && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium shrink-0">
                  전체
                </span>
              )}
              {selectedRoom.party_tag && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                  PP_BADGE[selectedRoom.party_tag] ?? PP_BADGE['무소속']
                )}>
                  {selectedRoom.party_tag}
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors shrink-0"
                >
                  <Pencil size={14} />
                </button>
              )}
              {/* 사용자 초대 (개설자/Admin) S */}
              {(isCreator || myProfile?.role === 'admin') && !selectedRoom.is_global && (
                <button
                  onClick={() => { setShowInviteModal(true); setPendingInvites([]); setInviteQuery(''); setInviteResults([]); }}
                  title="사용자 초대"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors shrink-0"
                >
                  <UserPlus size={14} />
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
                  'p-1.5 rounded-lg transition-colors shrink-0',
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
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-primary dark:hover:text-yellow-primary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors shrink-0"
              >
                <PictureInPicture2 size={15} />
              </button>
            </div>

            {/* 공지 고정 바 */}
            {selectedRoom.announcement && (
              <button
                onClick={() => setAnnouncementPopup(true)}
                className="w-full px-4 py-2 bg-yellow-primary/10 border-b border-yellow-primary/20 flex items-center gap-2 shrink-0 hover:bg-yellow-primary/15 transition-colors text-left"
              >
                <span className="text-xs shrink-0">📌</span>
                <p className="text-xs font-medium text-yellow-primary dark:text-yellow-primary flex-1 truncate">
                  {selectedRoom.announcement}
                </p>
                <span className="text-xs text-gray-400 shrink-0">클릭하여 보기</span>
              </button>
            )}

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
                  msg.is_system ? (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-dark-surface px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className={cn('text-xs font-bold', ROLE_COLOR[msg.author_role] ?? ROLE_COLOR.user)}>
                          [{ROLE_LABEL[msg.author_role] ?? msg.author_role}] {msg.author_name}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', PP_BADGE[msg.author_pp] ?? PP_BADGE['무소속'])}>
                          {msg.author_pp}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(msg.created_at)}</span>
                      </div>
                      {msg.file_url ? (
                        <FileDisplay filePath={msg.file_url} fileName={msg.file_name} />
                      ) : (
                        <p className="text-sm bg-gray-100 dark:bg-dark-surface rounded-xl rounded-tl-sm px-3 py-2 max-w-2xl break-words text-gray-700 dark:text-gray-200">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  )
                ))}
              </div>

              {/* 멤버 사이드 패널 */}
              {showMembers && (
                <aside className="w-52 shrink-0 border-l border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col overflow-hidden">
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
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors"
                                >
                                  <span className={cn(
                                    'w-2 h-2 rounded-full shrink-0 animate-pulse',
                                    isOnline ? 'bg-green-400' : 'bg-red-400'
                                  )} />
                                  <span className={cn('text-xs truncate flex-1', ROLE_COLOR[m.role] ?? ROLE_COLOR.user)}>
                                    {selectedRoom.created_by === m.user_id && '👑 '}
                                    {m.name}
                                  </span>
                                  <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-bold shrink-0', PP_BADGE[m.pp] ?? PP_BADGE['무소속'])}>
                                    {m.pp}
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

            {/* 커맨드 자동완성 S */}
            {cmdSuggestions.length > 0 && (
              <div className="mx-3 mb-1 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-bg shadow-lg">
                {cmdSuggestions.map(cmd => (
                  <button
                    key={cmd}
                    type="button"
                    onMouseDown={() => setInput(CHAT_CMD_HINT[cmd] ?? cmd)}
                    className="w-full text-left px-4 py-2.5 text-sm font-mono text-red-primary dark:text-yellow-primary hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors border-b last:border-0 border-gray-100 dark:border-dark-border"
                  >
                    <span className="font-bold">{cmd}</span>
                    {(CHAT_CMD_HINT[cmd]?.length ?? 0) > cmd.length && (
                      <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{CHAT_CMD_HINT[cmd].slice(cmd.length)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 입력창 */}
            {isReadOnly ? (
              <div className="p-3 border-t border-gray-200 dark:border-dark-border flex items-center justify-center bg-white dark:bg-dark-bg shrink-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">📢 관리자만 메시지를 보낼 수 있는 공지 채널입니다</p>
              </div>
            ) : (
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
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && cmdSuggestions.length > 0) {
                      e.preventDefault();
                      setInput(CHAT_CMD_HINT[cmdSuggestions[0]] ?? cmdSuggestions[0]);
                    }
                  }}
                  placeholder={
                    uploading ? '파일 업로드 중...' :
                    isCreator ? '메시지, /kick, /announcement, /leave...' :
                    selectedRoom.is_support && myRank >= 1 ? '메시지, /end 또는 /leave' :
                    '메시지 또는 /leave...'
                  }
                  disabled={uploading}
                  maxLength={2000}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending || uploading}
                  className="px-4 py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40 shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            )}
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

      {/* ── 공지 팝업 ────────────────────────────────────────────────── */}
      {announcementPopup && selectedRoom?.announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📌</span>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">채팅방 공지사항</h2>
              </div>
              <button
                onClick={() => setAnnouncementPopup(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {selectedRoom.announcement}
            </p>
          </div>
        </div>
      )}

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
                maxLength={50}
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
                maxLength={50}
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

      {/* ── 방장 양도 확인 모달 ─────────────────────────────────────── */}
      {promoteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="font-bold text-gray-900 dark:text-white">방장 권한 양도</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-red-primary dark:text-yellow-primary">{promoteTarget.name}</span>
              님에게 방장 권한을 양도하시겠습니까?<br />
              양도 후 본인의 방장 권한은 사라집니다.
            </p>
            <div className="flex gap-3 mt-1">
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

      {/* ── 사용자 초대 모달 ──────────────────────────────────────── */}
      {showInviteModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">사용자 초대</h2>
              <button
                onClick={() => { setShowInviteModal(false); setPendingInvites([]); setInviteQuery(''); setInviteResults([]); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">이름으로 검색</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={inviteQuery}
                  onChange={e => setInviteQuery(e.target.value)}
                  placeholder="이름으로 검색..."
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
                />
              </div>
              {inviteResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-bg max-h-40 overflow-y-auto">
                  {inviteResults.map(u => {
                    const targetRank = ROLE_RANK[u.role] ?? 0;
                    const cannotInvite = targetRank > myRank;
                    const alreadyMember = roomMembers.some(m => m.user_id === u.id);
                    const isSelected = pendingInvites.some(i => i.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => !cannotInvite && !alreadyMember && togglePendingInvite(u)}
                        disabled={cannotInvite || alreadyMember}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b last:border-0 border-gray-100 dark:border-dark-border transition-colors',
                          cannotInvite || alreadyMember
                            ? 'opacity-50 cursor-not-allowed'
                            : isSelected
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
                        ) : alreadyMember ? (
                          <span className="text-xs text-gray-400">이미 참가 중</span>
                        ) : isSelected ? (
                          <span className="text-xs text-red-primary dark:text-yellow-primary font-semibold">✓ 선택됨</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {pendingInvites.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pendingInvites.map(u => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-primary/10 dark:bg-yellow-primary/10 text-red-primary dark:text-yellow-primary font-medium"
                    >
                      {u.name}
                      <button onClick={() => togglePendingInvite(u)} className="hover:opacity-70"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleInviteUsers}
              disabled={!pendingInvites.length || inviting}
              className="w-full py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors disabled:opacity-40"
            >
              {inviting ? '초대 중...' : `${pendingInvites.length}명 초대하기`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
