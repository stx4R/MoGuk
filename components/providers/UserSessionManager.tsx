'use client';

// 인증된 유저 공통 — 강제퇴장 감지 + Presence 등록 S
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UserSessionManager() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let kickChannel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, is_banned')
        .eq('id', user.id)
        .single();

      if (!profile || profile.is_banned) {
        await supabase.auth.signOut();
        router.push('/login?reason=banned');
        return;
      }

      // Presence 채널 — 전체 접속자 추적 S
      presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: user.id } },
      });
      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel!.track({
            user_id: user.id,
            name: profile.name,
            online_at: new Date().toISOString(),
          });
        }
      });

      // 강제 퇴장/차단 신호 수신 채널 S
      kickChannel = supabase.channel(`user-control:${user.id}`)
        .on('broadcast', { event: 'force_signout' }, async ({ payload }) => {
          await supabase.auth.signOut();
          router.push(`/login?reason=${payload?.action ?? 'kicked'}`);
        })
        .subscribe();
    }

    init();

    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      if (kickChannel) supabase.removeChannel(kickChannel);
    };
  }, [router]);

  return null;
}
