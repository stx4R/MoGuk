'use client';

// 인증된 유저 공통 — 강제퇴장 감지 + Presence 등록 (role, pp 포함) + 전체 접속자 Context 동기화 S
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOnlineUsers, type OnlineUser } from './OnlineUsersContext';

export default function UserSessionManager() {
  const router = useRouter();
  const { setOnlineUsers } = useOnlineUsers();

  useEffect(() => {
    const supabase = createClient();
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let kickChannel:    ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, is_banned, pp')
        .eq('id', user.id)
        .single();

      if (profile?.is_banned === true) {
        await supabase.auth.signOut();
        router.push('/login?reason=banned');
        return;
      }

      if (!profile) return;

      // Presence 채널 — role, pp 포함 추적, sync 이벤트로 Context 갱신 S
      presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: user.id } },
      });
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel!.presenceState<OnlineUser>();
          const all = Object.values(state).flat();
          const unique = Array.from(
            new Map(all.map((u) => [(u as OnlineUser).user_id, u as OnlineUser])).values()
          );
          setOnlineUsers(unique);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel!.track({
              user_id:   user.id,
              name:      profile.name,
              role:      profile.role ?? 'user',
              pp:        profile.pp   ?? '무소속',
              online_at: new Date().toISOString(),
            });
          }
        });

      // 강제 퇴장/차단 신호 수신 채널 S
      // H-1 fix: broadcast 수신 후 getUser()로 서버 검증 — 세션이 실제로 무효화된 경우에만 처리 S
      kickChannel = supabase.channel(`user-control:${user.id}`)
        .on('broadcast', { event: 'force_signout' }, async ({ payload }) => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            await supabase.auth.signOut();
            // NM-4 fix: reason 파라미터 화이트리스트 검증 — XSS/Open-Redirect 방지 S
            const VALID_REASONS = new Set(['kicked', 'banned', 'timeout']);
            const safeReason = VALID_REASONS.has(payload?.action) ? payload.action : 'kicked';
            router.push(`/login?reason=${safeReason}`);
          }
          // 세션이 유효하면 브로드캐스트 위조 — 무시
        })
        .subscribe();
    }

    init();

    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      if (kickChannel)    supabase.removeChannel(kickChannel);
    };
  }, [router, setOnlineUsers]);

  return null;
}
