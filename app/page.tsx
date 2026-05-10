// 메인 랜딩 페이지 S
import ParliamentBackground from '@/components/main/ParliamentBackground';
import LogoMarquee from '@/components/main/LogoMarquee';
import { Scale, Gavel, ScrollText, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* 히어로 섹션 */}
      <section className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[75vh] px-4">
        {/* 인터랙티브 배경 파티클 */}
        <ParliamentBackground />

        {/* 히어로 콘텐츠 */}
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* 배지 */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary border border-red-primary/20 dark:border-yellow-primary/20 mb-6 tracking-wider uppercase">
            <Scale size={12} />
            2026 · 제 2회 오량모의국회
          </span>

          {/* 메인 타이틀 */}
          <h1 className="text-5xl max-md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
            오량{' '}
            <span className="text-red-primary dark:text-yellow-primary">
              모의국회
            </span>
          </h1>
          <p className="text-lg max-md:text-base text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            민주주의의 가치를 직접 경험하는 청소년 모의 입법 활동.
            <br className="max-md:hidden" />
            토론하고, 발의하고, 투표하라.
          </p>

          {/* CTA 버튼 */}
          <div className="flex items-center justify-center gap-4 max-md:flex-col">
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-red-primary hover:bg-red-hover text-white font-semibold text-sm shadow-lg shadow-red-primary/25 dark:shadow-none transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Gavel size={16} />
              안건 투표하기
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-red-primary dark:hover:border-yellow-primary hover:text-red-primary dark:hover:text-yellow-primary transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ScrollText size={16} />
              프로그램 안내
            </Link>
          </div>
        </div>

        {/* 스크롤 유도 화살표 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 dark:text-gray-600">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* 스탯 요약 */}
      <section className="bg-gray-50 dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 max-md:grid-cols-1 gap-8 text-center">
          {[
            { value: '150+', label: '참가 의원' },
            { value: '15', label: '참여 동아리' },
            { value: '실시간', label: '투표 집계' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-extrabold text-red-primary dark:text-yellow-primary">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 동아리 로고 마키 */}
      <LogoMarquee />
    </div>
  );
}
