'use client';

// 프로그램 안내 페이지 — 데스크탑: 좌측 TOC + 우측 본문, 모바일: 아코디언 S
import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Info, Calendar, UserCheck,
  Flag, GitBranch, Star, Mic,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const SECTIONS = [
  { id: 'overview',    title: '대회 개요',    Icon: Info },
  { id: 'schedule',    title: '전체 일정',    Icon: Calendar },
  { id: 'roles',       title: '참가자 역할',  Icon: UserCheck },
  { id: 'parties',     title: '정당 구성',    Icon: Flag },
  { id: 'process',     title: '활동 흐름',    Icon: GitBranch },
  { id: 'evaluation',  title: '평가 기준',    Icon: Star },
  { id: 'speeches',    title: '본회의 발언',  Icon: Mic },
];

// ── 공통 스타일 헬퍼 ──────────────────────────────────────────────
const thClass = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-surface';
const tdClass = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-dark-border';
const tableWrap = 'w-full border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-dark-border">
      {children}
    </h2>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 dark:border-dark-border last:border-0">
      <span className="w-24 shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

// ── 섹션별 콘텐츠 ──────────────────────────────────────────────────
const CONTENT: Record<string, React.ReactNode> = {

  overview: (
    <div>
      <SectionTitle>대회 개요</SectionTitle>
      <div className="divide-y divide-gray-100 dark:divide-dark-border rounded-xl border border-gray-200 dark:border-dark-border px-5 py-1">
        <InfoRow label="활동 주제" value="정책 기반 사회 문제 해결" />
        <InfoRow label="기간" value="2026.05.29 (금) ~ 08.01 (토)" />
        <InfoRow label="장소" value="대전대신고등학교 1·2학년 교실, 백암관" />
        <InfoRow label="운영진" value="35명" />
        <InfoRow label="참가 규모" value="약 130명 (진보 40 · 보수 40 · 중도 50)" />
      </div>
    </div>
  ),

  schedule: (
    <div>
      <SectionTitle>전체 일정</SectionTitle>
      <div className={tableWrap}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>일시</th>
              <th className={thClass}>활동명</th>
              <th className={thClass}>내용</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-bg">
            {[
              ['03/30 ~ 04/03', '참가자 모집', '각 동아리별 참가자 모집'],
              ['04/05 ~ 04/06', '행정 처리', '참가자 선정, 특방 입장 (온라인)'],
              ['05/29 (금)', '개회식', '개회식 / 대전대신고'],
              ['05/29 ~ 07/24', '탐구 기간', '정책 탐구 및 구체화 / Zoom'],
              ['05/29 ~ 07/24', '멘토링', '멘토 피드백 및 갈등의 전략적 조언'],
              ['07/25 (토)', '상임위원회', '안건 심의·토론 / 대전대신고'],
              ['08/01 (토)', '본회의', '제안설명 → 질의/토론 → 전자 투표 표결 → 시상 / 대전대신고'],
            ].map(([date, name, desc]) => (
              <tr key={date}>
                <td className={cn(tdClass, 'font-semibold text-red-primary dark:text-yellow-primary whitespace-nowrap')}>{date}</td>
                <td className={tdClass}>{name}</td>
                <td className={cn(tdClass, 'text-gray-500 dark:text-gray-400')}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),

  roles: (
    <div>
      <SectionTitle>참가자 역할</SectionTitle>
      <div className="space-y-4">
        {[
          {
            role: '위원회 위원 / 국회의원',
            desc: '모든 참가자에게 공통으로 적용되는 기본 역할. 안건 탐구·제출·심의·투표에 참여한다.',
          },
          {
            role: '교섭단체 간사',
            desc: '상임위 협의를 위한 회의단체 대표. 교섭단체 소속 회원 중 선발.',
          },
          {
            role: '원내대표',
            desc: '의회에서 소속 당을 대표하여 발언하고 의사결정을 이끄는 역할.',
          },
          {
            role: '당대표',
            desc: '정당별 과제 제출을 독려하고 멘토링을 담당하는 리더십 역할.',
          },
        ].map(({ role, desc }) => (
          <div
            key={role}
            className="flex gap-4 p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border"
          >
            <span className="mt-0.5 w-2 h-2 rounded-full bg-red-primary dark:bg-yellow-primary shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{role}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),

  parties: (
    <div>
      <SectionTitle>정당 구성</SectionTitle>
      <div className={tableWrap}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>구분</th>
              <th className={cn(thClass, 'text-blue-500')}>진보</th>
              <th className={cn(thClass, 'text-red-primary')}>보수</th>
              <th className={cn(thClass, 'text-yellow-primary')}>중도</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-bg">
            <tr>
              <td className={cn(tdClass, 'font-semibold text-gray-600 dark:text-gray-300')}>이념</td>
              <td className={tdClass}>친 학생·노동자·외곽</td>
              <td className={tdClass}>친 학교·기업·도심</td>
              <td className={tdClass}>개인별 상이</td>
            </tr>
            <tr>
              <td className={cn(tdClass, 'font-semibold text-gray-600 dark:text-gray-300')}>인원</td>
              <td className={tdClass}>약 40명</td>
              <td className={tdClass}>약 40명</td>
              <td className={tdClass}>약 50명</td>
            </tr>
            <tr>
              <td className={cn(tdClass, 'font-semibold text-gray-600 dark:text-gray-300')}>당대표</td>
              <td className={tdClass}>조연재</td>
              <td className={tdClass}>정재욱</td>
              <td className={tdClass}>황성연</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ),

  process: (
    <div>
      <SectionTitle>활동 흐름</SectionTitle>

      {/* 플로우 화살표 */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        {['의안 탐구', '의안 제출', '상임위원회', '본회의'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary border border-red-primary/20 dark:border-yellow-primary/20">
              {step}
            </span>
            {i < arr.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 font-light text-lg">→</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {[
          {
            step: '의안 탐구',
            date: '05.29 ~ 07.24',
            desc: '상임위 주제에 맞는 회의안을 온라인(Zoom)으로 조사·구체화. 작성 기간 약 15일. 기말고사 이후 주제 및 구조화, 본론 작성으로 나누어 진행.',
          },
          {
            step: '의안 제출',
            date: '상임위 전',
            desc: '상임위 피드백과 자구심사를 거쳐 본회의에 제출. 정책위원회 검토를 통해 최종 안건 확정.',
          },
          {
            step: '상임위원회',
            date: '07.25 (토)',
            desc: '안건 심의·토론 후 본회의 상정 여부 결정. 교섭단체 간사 및 위원장 주도로 진행.',
          },
          {
            step: '본회의',
            date: '08.01 (토)',
            desc: '제안설명 → 질의·찬반 토론 → 전자 투표 표결 → 시상. 통과된 안건은 결과로 발표.',
          },
        ].map(({ step, date, desc }) => (
          <div
            key={step}
            className="flex gap-5 p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border"
          >
            <div className="shrink-0 text-right w-28">
              <p className="font-bold text-red-primary dark:text-yellow-primary text-sm">{step}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
            </div>
            <div className="border-l border-gray-200 dark:border-dark-border pl-5">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),

  evaluation: (
    <div>
      <SectionTitle>참가자 활동 평가 기준</SectionTitle>
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-6">
        {/* 가점 */}
        <div className="rounded-xl border border-yellow-primary/30 bg-yellow-primary/5 dark:bg-yellow-primary/5 p-5">
          <h3 className="font-bold text-yellow-primary mb-4 flex items-center gap-2 text-sm">
            <span className="text-lg">＋</span> 가점 항목
          </h3>
          <ul className="space-y-3">
            {[
              ['정책·법안이 본회의에 정식 상정됨', '+20'],
              ['제안 정책에 대한 이해도와 논리적 적절성', '+10'],
              ['정당 이념 및 주제와의 부합성', '+10'],
              ['회의 전반에 대한 참여도', '+10~20'],
              ['질의응답에 근거가 적절함', '+10~20'],
            ].map(([item, score]) => (
              <li key={item} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
                <span className="shrink-0 font-bold text-yellow-primary">{score}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 감점 */}
        <div className="rounded-xl border border-red-primary/30 bg-red-primary/5 p-5">
          <h3 className="font-bold text-red-primary mb-4 flex items-center gap-2 text-sm">
            <span className="text-lg">－</span> 감점 항목
          </h3>
          <ul className="space-y-3">
            {[
              ['정책 제안서 또는 관련 자료 미제출', '−10'],
              ['정책에 대한 이해 부족 또는 당론 배치', '−10'],
              ['정책 내용 사실 오류 또는 논리 비약', '−10'],
              ['회의 과정에서 불성실한 태도 (횟수당)', '−10'],
              ['참가자 비방·모욕 등 회의장 모독 (발언당)', '−20'],
            ].map(([item, score]) => (
              <li key={item} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
                <span className="shrink-0 font-bold text-red-primary">{score}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            ※ 감점 사항은 정책위원회의 직권으로 설정. 상임위원장 포함 현장 운영진도 동일 권한 보유. 중복 감점 가능.
          </p>
        </div>
      </div>
    </div>
  ),

  speeches: (
    <div>
      <SectionTitle>본회의 발언 종류</SectionTitle>
      <div className="space-y-4">
        {[
          {
            title: '5분 자유발언',
            badge: '회기 전 서면 신청',
            desc: '의원이 관심 의안·청원 등에 대해 자유롭게 의견을 말하는 발언. 간사 협의 필요. 5분 이내.',
          },
          {
            title: '신상 발언',
            badge: '회기 중 서면 신청',
            desc: '의원 일신상 문제가 생긴 경우 본인이 해명하는 발언. 5분 이내.',
          },
          {
            title: '의사진행 발언',
            badge: '본회의 중 서면 신청',
            desc: '회의 진행 방법에 이의를 제기하거나 의견을 개진하기 위한 발언. 5분 이내. 반론 발언 가능 (5분 이내).',
          },
        ].map(({ title, badge, desc }) => (
          <div
            key={title}
            className="p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary">
                {badge}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

// ── 메인 페이지 컴포넌트 ───────────────────────────────────────────
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
      { rootMargin: '-20% 0px -70% 0px' }
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

      {/* 페이지 헤더 */}
      <div className="mb-12">
        <p className="text-xs font-semibold text-red-primary dark:text-yellow-primary uppercase tracking-widest mb-2">
          2026 · 제 3회
        </p>
        <h1 className="text-4xl max-md:text-2xl font-extrabold text-gray-900 dark:text-white">
          오량 모의국회
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
          정책 기반 사회 문제 해결 · 2026.05.29 ~ 08.01
        </p>
      </div>

      {/* 데스크탑 2단 레이아웃 */}
      <div className="hidden md:flex gap-12">

        {/* 좌측 고정 TOC */}
        <aside className="w-52 shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              목차
            </p>
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map(({ id, title, Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={cn(
                    'flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeId === id
                      ? 'bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary border-l-2 border-red-primary dark:border-yellow-primary pl-2.5'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface'
                  )}
                >
                  <Icon size={13} className="shrink-0" />
                  {title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 우측 본문 */}
        <div className="flex-1 min-w-0 space-y-20">
          {SECTIONS.map(({ id }) => (
            <section
              key={id}
              id={id}
              ref={(el) => { sectionRefs.current[id] = el; }}
              className="scroll-mt-28"
            >
              {CONTENT[id]}
            </section>
          ))}
        </div>
      </div>

      {/* 모바일 아코디언 */}
      <div className="md:hidden space-y-2">
        {SECTIONS.map(({ id, title, Icon }) => (
          <div
            key={id}
            className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              onClick={() => setOpenAccordion(openAccordion === id ? null : id)}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={15} className="text-red-primary dark:text-yellow-primary shrink-0" />
                {title}
              </span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform duration-200 shrink-0',
                  openAccordion === id && 'rotate-180'
                )}
              />
            </button>
            {openAccordion === id && (
              <div className="px-5 py-5 bg-white dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border">
                {CONTENT[id]}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
