'use client';

// 실시간 공지 배너 — Broadcast 수신으로 role 무관 전체 전달, 120초 자동 소멸 S
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Announcement = {
  id: string;
  content: string;
  author: string;
  created_at: string;
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    let timer: ReturnType<typeof setTimeout>;

    async function subscribe() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // 페이지 진입 시 DB에서 아직 유효한 공지 조회 (broadcast를 놓친 경우 대비) S
      const { data: latest } = await supabase
        .from('announcements')
        .select('id, content, author, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        setAnnouncement(latest as Announcement);
        const remaining = new Date((latest as any).expires_at).getTime() - Date.now();
        timer = setTimeout(() => setAnnouncement(null), remaining);
      }

      // H-1 fix: broadcast 대신 postgres_changes 사용 — RLS로 DB 삽입이 Admin만 가능하므로 위조 불가 S
      const channel = supabase
        .channel('global:announcements')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'announcements',
        }, (payload) => {
          const data = payload.new as any;
          if (!data || new Date(data.expires_at) <= new Date()) return;
          setAnnouncement(data as Announcement);
          clearTimeout(timer);
          const remaining = new Date(data.expires_at).getTime() - Date.now();
          timer = setTimeout(() => setAnnouncement(null), remaining);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        clearTimeout(timer);
      };
    }

    let cleanup: (() => void) | undefined;
    subscribe().then((fn) => { cleanup = fn; });

    return () => { cleanup?.(); };
  }, []);

  // 글자 수 비례 스크롤 속도 (가독성 최적화) — 짧은 텍스트는 느리게, 긴 텍스트는 빠르게 S
  const duration = announcement
    ? Math.max(15, announcement.content.length * 0.18)
    : 15;

  const copyStyle: { [key: string]: string | number } = {
    display: 'inline-block',
    minWidth: '100vw',
    paddingRight: '3rem',
    whiteSpace: 'nowrap',
  };

  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          key={announcement.id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: '2.75rem', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="w-full bg-white text-black overflow-hidden border-b-2 border-red-primary z-40 relative"
          style={{ willChange: 'height' }}
        >
          <div className="h-full flex items-center overflow-hidden">
            <span
              className="inline-flex font-bold text-sm"
              style={{
                animation: `announcement-scroll ${duration}s linear infinite`,
                willChange: 'transform',
              }}
            >
              <span style={copyStyle}>
                📢&nbsp;{announcement.content}&nbsp;
                <span className="text-xs font-normal text-gray-500">
                  (Admin {announcement.author})
                </span>
              </span>
              <span style={copyStyle}>
                📢&nbsp;{announcement.content}&nbsp;
                <span className="text-xs font-normal text-gray-500">
                  (Admin {announcement.author})
                </span>
              </span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
