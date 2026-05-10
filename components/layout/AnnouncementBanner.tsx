'use client';

// 실시간 공지 배너 — Supabase Realtime 수신, 120초 자동 소멸 S
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

      const channel = supabase
        .channel('public:announcements')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload) => {
            const data = payload.new as Announcement;
            setAnnouncement(data);
            clearTimeout(timer);
            timer = setTimeout(() => setAnnouncement(null), 120_000);
          }
        )
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

  // 글자 수 비례 스크롤 속도 (가독성 최적화) S
  const duration = announcement
    ? Math.max(8, announcement.content.length * 0.08)
    : 10;

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
          <div className="h-full flex items-center overflow-hidden whitespace-nowrap">
            <motion.span
              className="inline-block font-bold text-sm"
              style={{
                animation: `announcement-scroll ${duration}s linear infinite`,
              }}
            >
              📢&nbsp;
              {announcement.content}
              &nbsp;
              <span className="text-xs font-normal text-gray-500">
                (Admin {announcement.author})
              </span>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              📢&nbsp;
              {announcement.content}
              &nbsp;
              <span className="text-xs font-normal text-gray-500">
                (Admin {announcement.author})
              </span>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
