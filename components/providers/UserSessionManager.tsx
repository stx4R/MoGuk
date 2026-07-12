'use client';

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
              pp:        profile.pp   ?? '무소속',
              online_at: new Date().toISOString(),
            });
          }
        });

      kickChannel = supabase.channel(`user-control:${user.id}`)
        .on('broadcast', { event: 'force_signout' }, async ({ payload }) => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            await supabase.auth.signOut();
            const VALID_REASONS = new Set(['kicked', 'banned', 'timeout']);
            const safeReason = VALID_REASONS.has(payload?.action) ? payload.action : 'kicked';
            router.push(`/login?reason=${safeReason}`);
          }
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
