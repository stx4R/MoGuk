'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

// ── 상수 ──────────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const VP   = { once: true, margin: '-8%' as const };

// ── 데이터 ────────────────────────────────────────────────────────
const STATS = [
  { value: 100, suffix: '명',  label: '총 참가자' },
  { value: 9,   suffix: '개',  label: '부처'  },
  { value: 36,  suffix: '명',  label: '운영진'    },
  { value: 58,   suffix: '일', label: '활동 기간' },
];

const TIMELINE = [
  { date: '05/18 ~ 05/21', name: '참가자 모집',  desc: '각 동아리별 참가자 모집' },
  { date: '05/29 (금)',     name: '개회식',       desc: '대전대신고에서 공식 개회' },
  { date: '05.29 ~ 07.19', name: '탐구·멘토링',  desc: '정책 탐구 및 구체화, Zoom 멘토링' },
  { date: '07/18 (토)',     name: '상임위원회',   desc: '안건 심의·토론 / 대전대신고' },
  { date: '07/25 (토)',     name: '본회의',       desc: '제안설명 → 질의/토론 → 전자 투표 → 시상 & 정책 전시회' },
];

// 9개 상임위원회(부처) 데이터 S
const DEPARTMENTS = [
  { name: '법무부',            chair: '조연재',      evaluator: '이주환',              desc: '법 제도 개혁' },
  { name: '방송미디어통신위원회', chair: '김준혁',      evaluator: '장재원',              desc: '방송의 규제 기준 개정 (완화/강화 전부 포함)' },
  { name: '교육부',            chair: '김도엽',      evaluator: '강민찬',              desc: '다문화 교육, 중·고등 교육 정책 수립' },
  { name: '고용노동부',         chair: '고원세',      evaluator: '김지후(동방高)',       desc: '미래 노동환경 변화 대응을 위한 노동정책' },
  { name: '중소벤처기업부',      chair: '조승찬',      evaluator: '기호준',              desc: '중소기업의 보호와 육성' },
  { name: '기후에너지환경부',    chair: '김지후(대신高 - 날샘)', evaluator: '이건희(대신高 - DOYL)',         desc: '미래 산업 에너지 정책 수립' },
  { name: '행정안전부',         chair: '서지후',      evaluator: '오시훈',              desc: '국가 행정 정책 수립' },
  { name: '재정경제부',         chair: '노승민',      evaluator: '강원우',              desc: '국가 재정, 경제, 국제 금융 대응 정책' },
  { name: '외교부',            chair: '김영광',      evaluator: '유하연, 백다경', desc: '글로벌워킹 다문화를 위한 중견국 외교 전략 수립' },
];

const PARTIES = [
  {
    name: '진보', count: 40, leader: '김동하', ideology: '친 학생·노동자·외곽',
    leftBorder: 'border-l-blue-500',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  },
  {
    name: '보수', count: 40, leader: '정재욱', ideology: '친 학교·기업·도심',
    leftBorder: 'border-l-red-primary',
    dot: 'bg-red-primary',
    badge: 'bg-red-primary/15 text-red-primary border border-red-primary/30',
  },
  {
    name: '중도', count: 50, leader: '황성연', ideology: '개인별 상이',
    leftBorder: 'border-l-yellow-primary',
    dot: 'bg-yellow-primary',
    badge: 'bg-yellow-primary/15 text-yellow-primary border border-yellow-primary/30',
  },
];

const PROCESS = [
  { num: 1, name: '의안 탐구',  date: '05.29 ~ 07.18', desc: '상임위 주제에 맞는 회의안 조사·구체화' },
  { num: 2, name: '의안 제출',  date: '상임위 전',      desc: '피드백·자구심사 후 최종 안건 확정' },
  { num: 3, name: '상임위원회', date: '07.18 (토)',     desc: '안건 심의·토론 후 본회의 상정 결정' },
  { num: 4, name: '본회의',     date: '07.25 (월)',     desc: '제안설명 → 토론 → 전자 투표 → 시상' },
];

// ── CountUp ──────────────────────────────────────────────────────
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, target, {
      duration: 1.6,
      ease: EASE,
      onUpdate: v => setN(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [inView, target]);

  return <span ref={ref}>{n}{suffix}</span>;
}

// ── SectionHeader ─────────────────────────────────────────────────
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={{ duration: 0.7, ease: EASE }}
      className="mb-12"
    >
      <p className="text-[10px] font-bold text-yellow-primary uppercase tracking-[0.35em] mb-3">{label}</p>
      <h2 className="text-3xl md:text-4xl font-extrabold text-white">{title}</h2>
    </motion.div>
  );
}

// ── TimelineCard ──────────────────────────────────────────────────
function TimelineCard({ date, name, desc }: { date: string; name: string; desc: string }) {
  return (
    <div className="inline-block rounded-2xl bg-[#141720] border border-white/6 p-5 max-w-xs">
      <span className="inline-block mb-2 text-xs font-bold px-2.5 py-1 rounded-full bg-red-primary/15 text-red-400 border border-red-primary/25">
        {date}
      </span>
      <p className="font-bold text-white text-sm mb-1">{name}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 메인 페이지
// ══════════════════════════════════════════════════════════════════
export default function AboutPage() {
  const LINE1 = '제 3회  오량';
  const LINE2 = '모의국회';

  return (
    <div className="bg-[#0a0c12] text-white">

      {/* ════════════════════════════════════════════════════════
          1. Hero
      ════════════════════════════════════════════════════════ */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-red-primary/10 rounded-full blur-[130px]" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-yellow-primary/7 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 px-4">
          {/* 회차 레이블 */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-xs font-bold text-yellow-primary uppercase tracking-[0.38em] mb-8"
          >
            2026 정책기반 사회문제 해결 프로젝트
          </motion.p>

          {/* 타이틀 글자별 슬라이드업 */}
          {[LINE1, LINE2].map((line, li) => (
            <div key={li} className="overflow-hidden">
              <div className="flex justify-center">
                {line.split('').map((c, ci) => {
                  const delay = (li === 0 ? ci : LINE1.length + ci) * 0.06;
                  return (
                    <motion.span
                      key={ci}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.7, ease: EASE, delay }}
                      className="text-6xl md:text-[8.5rem] font-black tracking-tight leading-[1.05] inline-block"
                    >
                      {c}
                    </motion.span>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 서브타이틀 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.8, ease: EASE }}
            className="text-gray-400 text-base md:text-lg mt-8 mb-12"
          >
          2026.05.29 ~ 2026.07.25
          </motion.p>

          {/* 스크롤 인디케이터 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="flex justify-center text-gray-600"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              <ArrowDown size={20} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2. 대회 개요 + Stats
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0e111a]">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="대회 개요" title="제 3회 오량모의국회" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="mb-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-400"
          >
            <span>
              <span className="text-gray-600 font-semibold">장소 · </span>
              대전대신고등학교
            </span>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ value, suffix, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{ duration: 0.65, ease: EASE, delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-[#141720] border border-white/5 p-6"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 ${
                    i % 2 === 0 ? 'bg-red-primary' : 'bg-yellow-primary'
                  }`}
                />
                <p className="text-3xl md:text-4xl font-black text-white mb-1">
                  <CountUp target={value} suffix={suffix} />
                </p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          3. 일정 타임라인
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0a0c12]">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="전체 일정" title="활동 타임라인" />

          <div className="relative">
            {/* 데스크탑: 중앙 세로 라인 */}
            <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-white/5 hidden md:block" />
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={VP}
              transition={{ duration: 1.4, ease: EASE }}
              style={{ originY: 0 }}
              className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-red-primary via-yellow-primary to-red-primary hidden md:block"
            />

            {TIMELINE.map(({ date, name, desc }, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isLeft ? -48 : 48 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={VP}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.07 }}
                  className="mb-8 md:grid md:grid-cols-[1fr_2rem_1fr] md:gap-8 md:items-center"
                >
                  {/* 좌측 */}
                  <div className={isLeft ? 'md:flex md:justify-end' : ''}>
                    {isLeft
                      ? <TimelineCard date={date} name={name} desc={desc} />
                      : <div className="hidden md:block" />
                    }
                  </div>

                  {/* 중앙 도트 */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#0a0c12] border-2 border-yellow-primary shadow-[0_0_10px_rgba(241,196,15,0.4)] z-10" />
                  </div>

                  {/* 우측 */}
                  <div>
                    {!isLeft
                      ? <TimelineCard date={date} name={name} desc={desc} />
                      : <div className="hidden md:block" />
                    }
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4. 상임위원회(부처) 소개
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0e111a]">
        <div className="max-w-5xl mx-auto">
          <SectionHeader label="참가자 구성" title="상임위원회 소개" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEPARTMENTS.map(({ name, chair, evaluator, desc }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}
                className="relative overflow-hidden rounded-2xl bg-[#141720] border border-white/5 hover:border-yellow-primary/20 transition-colors duration-300 p-5"
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${i % 2 === 0 ? 'bg-red-primary' : 'bg-yellow-primary'}`} />
                <p className="font-extrabold text-white text-sm mb-2 mt-1">{name}</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{desc}</p>
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider shrink-0">상임위원장</span>
                    <span className="text-xs text-gray-300 text-right">{chair}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider shrink-0">평가위원</span>
                    <span className="text-xs text-gray-300 text-right">{evaluator}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          5. 정당 구성
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0a0c12]">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="정당 구성" title="3당 체제" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PARTIES.map(({ name, count, leader, ideology, leftBorder, dot, badge }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{ duration: 0.65, ease: EASE, delay: i * 0.1 }}
                className={`rounded-2xl bg-[#141720] border-t border-r border-b border-white/5 border-l-4 ${leftBorder} p-6`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span className="font-extrabold text-white text-lg">{name}</span>
                  <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>
                    {count}명
                  </span>
                </div>
                <div className="space-y-2.5">
                  {([['당대표', leader], ['이념', ideology]] as const).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-0.5">{k}</p>
                      <p className="text-sm text-gray-300">{v}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          6. 활동 흐름
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0e111a]">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="활동 과정" title="활동 흐름" />

          {/* 데스크탑: 가로 스테퍼 */}
          <div className="hidden md:block">
            <div className="relative">
              {/* 배경 트랙 */}
              <div className="absolute left-[12.5%] right-[12.5%] top-5 h-px bg-white/8" />
              {/* 채워지는 라인 */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={VP}
                transition={{ duration: 1.0, ease: EASE, delay: 0.25 }}
                style={{ originX: 0 }}
                className="absolute left-[12.5%] right-[12.5%] top-5 h-px bg-gradient-to-r from-red-primary via-yellow-primary to-red-primary"
              />
              <div className="grid grid-cols-4">
                {PROCESS.map(({ num, name, date, desc }, i) => (
                  <motion.div
                    key={num}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VP}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
                    className="flex flex-col items-center text-center px-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-primary flex items-center justify-center text-white font-black text-sm mb-5 shadow-[0_0_20px_rgba(192,57,43,0.35)] relative z-10">
                      {num}
                    </div>
                    <p className="font-bold text-white text-sm mb-1">{name}</p>
                    <p className="text-xs text-yellow-primary font-semibold mb-2">{date}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* 모바일: 세로 스테퍼 */}
          <div className="md:hidden relative pl-10">
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/8" />
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={VP}
              transition={{ duration: 1.2, ease: EASE }}
              style={{ originY: 0 }}
              className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-red-primary to-yellow-primary"
            />
            <div className="space-y-8">
              {PROCESS.map(({ num, name, date, desc }, i) => (
                <motion.div
                  key={num}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={VP}
                  transition={{ duration: 0.55, ease: EASE, delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-red-primary shadow-[0_0_12px_rgba(192,57,43,0.45)] flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">{num}</span>
                  </div>
                  <div className="rounded-xl bg-[#141720] border border-white/5 p-4">
                    <p className="font-bold text-white text-sm mb-0.5">{name}</p>
                    <p className="text-xs text-yellow-primary font-semibold mb-1.5">{date}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          Footer
      ════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 text-center border-t border-white/5 bg-[#0a0c12]">
        <p className="text-gray-700 text-sm">제 3회 오량모의국회 · 2026</p>
      </section>

    </div>
  );
}
