// 프로그램 안내 페이지 — 데스크탑: 좌측 TOC + 우측 본문, 모바일: 아코디언 S
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const SECTIONS = [
  {
    id: 'overview',
    title: '대회 개요',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
  {
    id: 'schedule',
    title: '전체 일정',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
  {
    id: 'rules',
    title: '운영 규칙',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
  {
    id: 'process',
    title: '진행 프로세스',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
  {
    id: 'org',
    title: '운영진 위계도',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
  {
    id: 'faq',
    title: '자주 묻는 질문',
    content: `텍스트 1\n\n텍스트 2\n\n텍스트 3`,
  },
];

export default function AboutPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 스크롤 스파이 S
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );

    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 데스크탑 2단 레이아웃 */}
      <div className="hidden md:flex gap-12">
        {/* 좌측 고정 TOC */}
        <aside className="w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              목차
            </p>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeId === s.id
                      ? 'bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary border-l-2 border-red-primary dark:border-yellow-primary'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface'
                  )}
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 우측 본문 */}
        <div className="flex-1 min-w-0 space-y-16">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              ref={(el) => { sectionRefs.current[s.id] = el; }}
              className="scroll-mt-28"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-dark-border">
                {s.title}
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* 모바일 아코디언 */}
      <div className="md:hidden space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          프로그램 안내
        </h1>
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              onClick={() => setOpenAccordion(openAccordion === s.id ? null : s.id)}
            >
              {s.title}
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform duration-200',
                  openAccordion === s.id && 'rotate-180'
                )}
              />
            </button>
            {openAccordion === s.id && (
              <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-dark-bg leading-relaxed whitespace-pre-line border-t border-gray-100 dark:border-dark-border">
                {s.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
