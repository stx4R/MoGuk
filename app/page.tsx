'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
  Landmark, Hammer, FileText, ChevronDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const STATS = [
  { count: 100, suffix: '명', label: '총 참가자' },
  { count: 9,   suffix: '개', label: '부처' },
  { count: 36,  suffix: '명', label: '운영진' },
  { count: 58,  suffix: '일', label: '활동 기간' },
];

const CLUBS = [
  'dcn','doyl','flow-communicators','nalssam','one-press','path-finder',
  'inspire','gyojiphap','eunoia','right-us','unify','link',
];

const CLUB_ALTS: Record<string, string> = {
  dcn:'DCN', doyl:'DOYL', 'flow-communicators':'Flow Communicators',
  nalssam:'NALSSAM', 'one-press':'ONE-PRESS', 'path-finder':'Path Finder',
  inspire:'Inspire', gyojiphap:'교집합', eunoia:'EUNOIA',
  'right-us':'Right-us', unify:'UNIFY', link:'L-INK',
};

const TIMELINE = [
  { date: '05/18 ~ 05/21', name: '참가자 모집',   desc: '각 동아리별 참가자 모집' },
  { date: '05/29 (금)',     name: '개회식',         desc: '대전대신고에서 공식 개회' },
  { date: '05.29 ~ 07.19', name: '탐구·멘토링',    desc: '정책 탐구 및 구체화, Zoom 멘토링' },
  { date: '07/18 (토)',     name: '상임위원회',      desc: '안건 심의·토론 / 대전대신고' },
  { date: '07/25 (토)',     name: '본회의',          desc: '제안설명 → 질의/토론 → 전자 투표 → 시상' },
];

const DEPTS = [
  { name: '법무부',             chair: '조연재', evaluator: '이주환',       desc: '법 제도 개혁' },
  { name: '방송미디어통신위원회', chair: '김준혁', evaluator: '장재원',       desc: '방송의 규제 기준 개정' },
  { name: '교육부',             chair: '김도엽', evaluator: '강민찬',       desc: '다문화 교육, 중·고등 교육 정책 수립' },
  { name: '고용노동부',          chair: '고원세', evaluator: '김지후C',      desc: '미래 노동환경 변화 대응 노동정책' },
  { name: '중소벤처기업부',       chair: '조승찬', evaluator: '기호준',       desc: '중소기업의 보호와 육성' },
  { name: '기후에너지환경부',     chair: '김지후B', evaluator: '이건희',      desc: '미래 산업 에너지 정책 수립' },
  { name: '행정안전부',          chair: '서지후',  evaluator: '오시훈',      desc: '국가 행정 정책 수립' },
  { name: '재정경제부',          chair: '노승민',  evaluator: '강원우',      desc: '국가 재정·경제·국제 금융 대응' },
  { name: '외교부',             chair: '김영광',  evaluator: '유하연, 백다경', desc: '중견국 외교 전략 수립' },
];

const PARTIES = [
  {
    key: 'jinbo', name: '진보', count: '40명',
    leader: '김동하', ideology: '친 학생·노동자·외곽',
    color: 'var(--jinbo)',
    bgCount: 'bg-[rgba(83,157,245,0.15)]', textCount: 'text-jinbo',
  },
  {
    key: 'bosu', name: '보수', count: '40명',
    leader: '정재욱', ideology: '친 학교·기업·도심',
    color: 'var(--bosu)',
    bgCount: 'bg-[rgba(243,114,127,0.15)]', textCount: 'text-negative',
  },
  {
    key: 'jungdo', name: '중도', count: '50명',
    leader: '황성연', ideology: '개인별 상이',
    color: 'var(--jungdo)',
    bgCount: 'bg-[rgba(255,255,255,0.08)]', textCount: 'text-text-secondary',
  },
];

const PROCESS = [
  { num: 1, name: '의안 탐구',  date: '05.29 ~ 07.18', desc: '상임위 주제 조사·구체화' },
  { num: 2, name: '의안 제출',  date: '상임위 전',       desc: '피드백·자구심사 후 안건 확정' },
  { num: 3, name: '상임위원회',  date: '07.18 (토)',     desc: '안건 심의·토론 후 본회의 상정' },
  { num: 4, name: '본회의',     date: '07.25 (월)',     desc: '제안설명 → 토론 → 전자 투표 → 시상' },
];

const REVEAL_PROPS = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      {...REVEAL_PROPS}
      transition={{ ...REVEAL_PROPS.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return <span ref={ref}>{value}{suffix}</span>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.32em] uppercase text-green">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-[clamp(28px,5vw,38px)] font-extrabold tracking-[-0.02em] text-text-base">
      {children}
    </h2>
  );
}

export default function HomePage() {
  const allClubs = [...CLUBS, ...CLUBS];

  return (
    <>
      <section className="relative min-h-[86vh] flex flex-col items-center justify-center text-center overflow-hidden px-6 py-20">
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 460, height: 460,
            background: 'rgba(30,215,96,0.12)',
            filter: 'blur(120px)',
            top: '18%', left: '50%', transform: 'translateX(-60%)',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 320, height: 320,
            background: 'rgba(83,157,245,0.08)',
            filter: 'blur(120px)',
            bottom: '8%', right: '22%',
          }}
        />

        <div className="relative z-10 max-w-[940px]">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[0.12em] bg-[rgba(30,215,96,0.15)] text-green border border-[rgba(30,215,96,0.25)]"
          >
            <Landmark size={13} />
            2026 정책기반 사회문제 해결 프로젝트
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="font-extrabold tracking-[-0.03em] leading-[1.02] mt-5"
            style={{ fontSize: 'clamp(44px, 9vw, 104px)' }}
          >
            <span className="whitespace-nowrap">
              <span style={{ color: '#6f6f6f' }}>제 3회</span>{' '}오량
            </span>{' '}
            <span className="whitespace-nowrap text-green">모의국회</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-text-secondary mt-6 mb-9"
            style={{ fontSize: 'clamp(16px, 2.4vw, 22px)', lineHeight: 1.6 }}
          >
            보이지 않는 곳에서<br />보이는 것을 위하여
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="flex items-center justify-center gap-3.5 flex-wrap"
          >
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold bg-green text-black hover:brightness-110 active:scale-95 transition-all duration-150"
            >
              <Hammer size={17} />
              안건 투표하기
            </Link>
            <Link
              href="#about"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-text-base border border-border-light hover:border-text-base active:scale-95 transition-all duration-150"
            >
              <FileText size={17} />
              프로그램 안내
            </Link>
          </motion.div>
        </div>

        <a
          href="#about"
          className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[#5a5a5a] z-10"
          style={{ animation: 'bob 1.8s ease-in-out infinite' }}
          aria-label="아래로 스크롤"
        >
          <ChevronDown size={26} />
        </a>

        <style jsx>{`
          @keyframes bob {
            0%, 100% { transform: translate(-50%, 0); }
            50%       { transform: translate(-50%, 8px); }
          }
        `}</style>
      </section>

      <div className="border-t border-[var(--hairline)] border-b border-[var(--hairline)] bg-surface">
        <div className="max-w-[var(--maxw)] mx-auto px-6 py-11 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="font-extrabold tracking-[-0.02em] text-text-base"
                style={{ fontSize: 'clamp(32px, 4.6vw, 50px)' }}
              >
                <CountUp to={s.count} suffix={s.suffix} />
              </div>
              <div className="text-text-secondary text-[13px] font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-11 bg-bg-base border-b border-[var(--hairline)] overflow-hidden">
        <p className="text-center text-[11px] font-bold tracking-[0.3em] uppercase text-[#6f6f6f] mb-7">
          참여 동아리
        </p>
        <div className="relative flex overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, var(--bg-base), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(270deg, var(--bg-base), transparent)' }} />
          <div
            className="flex items-center gap-14 w-max"
            style={{ animation: 'marquee 38s linear infinite' }}
          >
            {allClubs.map((c, i) => (
              <Image
                key={i}
                src={`/clubs/${c}.png`}
                alt={CLUB_ALTS[c] ?? c}
                width={96}
                height={34}
                unoptimized
                style={{ height: 34, width: 'auto', objectFit: 'contain', filter: 'grayscale(100%) brightness(0) invert(1)', opacity: 0.55 }}
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>

      <section id="about" className="px-6 py-24 max-w-[920px] mx-auto">
        <Reveal>
          <div className="mb-12">
            <SectionEyebrow>대회 개요</SectionEyebrow>
            <SectionTitle>제 3회 오량모의국회</SectionTitle>
          </div>
          <div className="flex flex-wrap gap-y-2 gap-x-7 text-[14px] text-text-secondary">
            <span><span className="font-semibold text-[#6f6f6f]">장소 · </span>대전대신고등학교</span>
            <span><span className="font-semibold text-[#6f6f6f]">기간 · </span>2026.05.29 ~ 2026.07.25</span>
          </div>
        </Reveal>
      </section>

      <section id="timeline" className="px-6 pb-24 max-w-[920px] mx-auto">
        <Reveal className="mb-12">
          <SectionEyebrow>전체 일정</SectionEyebrow>
          <SectionTitle>활동 타임라인</SectionTitle>
        </Reveal>

        <div className="relative hidden sm:block">
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px"
            style={{ background: 'var(--hairline)' }}
          />
          <div className="flex flex-col gap-6">
            {TIMELINE.map((t, i) => {
              const isLeft = i % 2 === 0;
              return (
                <Reveal key={i} delay={i * 0.05}>
                  <div className="grid grid-cols-[1fr_40px_1fr] gap-7 items-center">
                    {isLeft ? (
                      <>
                        <div className="flex justify-end">
                          <TlCard {...t} />
                        </div>
                        <TlDot />
                        <div />
                      </>
                    ) : (
                      <>
                        <div />
                        <TlDot />
                        <TlCard {...t} />
                      </>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <div className="sm:hidden relative">
          <div
            className="absolute left-[18px] top-0 bottom-0 w-px"
            style={{ background: 'var(--hairline)' }}
          />
          <div className="flex flex-col gap-4 pl-12">
            {TIMELINE.map((t, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <TlCard {...t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="departments" className="px-6 pb-24 max-w-[var(--maxw)] mx-auto">
        <Reveal className="mb-12">
          <SectionEyebrow>참가자 구성</SectionEyebrow>
          <SectionTitle>상임위원회 소개</SectionTitle>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPTS.map((d, i) => (
            <Reveal key={d.name} delay={i * 0.04}>
              <div className="group bg-surface border border-[var(--hairline)] rounded-2xl p-5 hover:border-[rgba(30,215,96,0.4)] hover:-translate-y-0.5 transition-all duration-200 h-full">
                <div className="font-extrabold text-[15px] text-text-base">{d.name}</div>
                <div className="text-text-secondary text-[13px] leading-[1.55] mt-2 mb-4">{d.desc}</div>
                <div className="flex flex-col gap-1.5 pt-3.5 border-t border-[var(--hairline)]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] text-[#6f6f6f] font-bold uppercase tracking-wide">상임위원장</span>
                    <span className="text-[12px] text-text-near-white text-right">{d.chair}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] text-[#6f6f6f] font-bold uppercase tracking-wide">평가위원</span>
                    <span className="text-[12px] text-text-near-white text-right">{d.evaluator}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="parties" className="px-6 pb-24 max-w-[920px] mx-auto">
        <Reveal className="mb-12">
          <SectionEyebrow>정당 구성</SectionEyebrow>
          <SectionTitle>3당 체제</SectionTitle>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PARTIES.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.07}>
              <div
                className="bg-surface border border-[var(--hairline)] rounded-2xl p-6"
                style={{ borderTopWidth: 3, borderTopColor: p.color }}
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="font-extrabold text-[18px] text-text-base">{p.name}</span>
                  <span className={cn('ml-auto text-[12px] font-bold px-2.5 py-1 rounded-full', p.bgCount, p.textCount)}>
                    {p.count}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <div className="text-[10px] text-[#6f6f6f] font-bold uppercase tracking-wide mb-0.5">당대표</div>
                    <div className="text-[14px] text-text-near-white">{p.leader}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6f6f6f] font-bold uppercase tracking-wide mb-0.5">이념</div>
                    <div className="text-[14px] text-text-near-white">{p.ideology}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="process" className="px-6 pb-24 max-w-[920px] mx-auto">
        <Reveal className="mb-12">
          <SectionEyebrow>활동 과정</SectionEyebrow>
          <SectionTitle>활동 흐름</SectionTitle>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {PROCESS.map((p, i) => (
            <Reveal key={p.num} delay={i * 0.07}>
              <div className="flex sm:flex-col sm:items-center sm:text-center gap-3.5">
                <div
                  className="w-11 h-11 shrink-0 rounded-full bg-green text-black font-extrabold text-[16px] flex items-center justify-center"
                  style={{ boxShadow: '0 0 20px rgba(30,215,96,0.3)' }}
                >
                  {p.num}
                </div>
                <div>
                  <div className="font-bold text-[15px] text-text-base">{p.name}</div>
                  <div className="text-green text-[12px] font-bold mt-1">{p.date}</div>
                  <div className="text-text-secondary text-[13px] leading-[1.5] mt-2">{p.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

function TlCard({ date, name, desc }: { date: string; name: string; desc: string }) {
  return (
    <div
      className="inline-block bg-surface border border-[var(--hairline)] rounded-2xl p-4 max-w-[340px]"
    >
      <span className="inline-block text-[12px] font-bold px-2.5 py-1 rounded-full bg-[rgba(30,215,96,0.14)] text-green mb-2">
        {date}
      </span>
      <div className="font-bold text-[15px] text-text-base">{name}</div>
      <div className="text-text-secondary text-[13px] leading-[1.5] mt-1">{desc}</div>
    </div>
  );
}

function TlDot() {
  return (
    <div
      className="w-3.5 h-3.5 rounded-full bg-bg-base border-2 border-green justify-self-center z-10"
      style={{ boxShadow: '0 0 12px rgba(30,215,96,0.4)' }}
    />
  );
}
