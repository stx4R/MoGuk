'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

// ── Phase 데이터 ──────────────────────────────────────────────────
const PHASES = [
  {
    label: '대회 기본 정보',
    object: '법봉',
    side: 'left' as const,
    title: '대회 개요 & 일정',
    items: [
      '기간: 2026.05.29 (금) ~ 08.01 (토)',
      '장소: 대전대신고등학교 1·2학년 교실, 백암관',
      '참가 규모: 진보 40명 · 보수 40명 · 중도 50명',
      '개회식 → 탐구·멘토링 → 상임위 07.25 → 본회의 08.01',
    ],
  },
  {
    label: '참가자 구성',
    object: '판사옷',
    side: 'right' as const,
    title: '역할 & 정당 구성',
    items: [
      '모든 참가자: 위원회 위원 / 국회의원 역할',
      '교섭단체 간사 · 원내대표 · 당대표 선발',
      '진보 (40) · 보수 (40) · 중도 (50) 3당 체제',
      '정당별 이념·전략·안건 탐구 병행 운영',
    ],
  },
  {
    label: '활동 과정',
    object: '의자',
    side: 'left' as const,
    title: '활동 흐름 & 평가',
    items: [
      '의안 탐구 → 의안 제출 → 상임위원회 → 본회의',
      '상임위: 안건 심의·토론 후 본회의 상정 결정',
      '본회의: 제안설명 → 질의/토론 → 전자 투표 표결',
      '평가: 정책 논리·이해도·참여도·질의응답 근거',
    ],
  },
];

// ── 파티클 배경 ───────────────────────────────────────────────────
function Particles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 200;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 24;
    return arr;
  }, []);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.03;
    ref.current.rotation.x += dt * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#f1c40f" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

// ── 법봉 (Gavel) — 뚱뚱한 버전 + 구형 끝 ────────────────────────
function Gavel({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  // 흔들림 방지: scale과 baseY를 별도 ref로 관리, position.set()으로 덮어쓰기
  const sv = useRef(0);
  const by = useRef(-5);

  useFrame((state, dt) => {
    const active = phaseRef.current === 0;
    sv.current = THREE.MathUtils.lerp(sv.current, active ? 1.1 : 0, dt * 3);
    by.current = THREE.MathUtils.lerp(by.current, active ? 0 : -5, dt * 3);
    g.current.scale.setScalar(sv.current);
    g.current.position.set(0, by.current + Math.sin(state.clock.elapsedTime * 0.8) * 0.07, 0);
    g.current.rotation.y = state.clock.elapsedTime * 0.45;
  });

  return (
    <group ref={g} scale={0} position={[0, -5, 0]}>
      {/* 자루 */}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.082, 0.105, 2.05, 24]} />
        <meshStandardMaterial color="#7B4A22" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* 머리 본체 — 뚱뚱하게 (radius 0.32) */}
      <mesh position={[0, 0.68, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 1.05, 28]} />
        <meshStandardMaterial color="#2A1200" roughness={0.2} metalness={0.08} />
      </mesh>
      {/* 머리 왼쪽 끝 — 구형 */}
      <mesh position={[-0.525, 0.68, 0]}>
        <sphereGeometry args={[0.32, 22, 22]} />
        <meshStandardMaterial color="#2A1200" roughness={0.2} metalness={0.08} />
      </mesh>
      {/* 머리 오른쪽 끝 — 구형 */}
      <mesh position={[0.525, 0.68, 0]}>
        <sphereGeometry args={[0.32, 22, 22]} />
        <meshStandardMaterial color="#2A1200" roughness={0.2} metalness={0.08} />
      </mesh>
      {/* 중앙 금속 밴드 */}
      <mesh position={[0, 0.68, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.328, 0.328, 0.14, 28]} />
        <meshStandardMaterial color="#D4A017" roughness={0.15} metalness={0.85} />
      </mesh>
      {/* 자루-머리 연결 금속 링 */}
      <mesh position={[0, 0.23, 0]}>
        <torusGeometry args={[0.1, 0.022, 12, 28]} />
        <meshStandardMaterial color="#D4A017" roughness={0.15} metalness={0.85} />
      </mesh>
      {/* 타격판 */}
      <mesh position={[0, -1.76, 0]}>
        <boxGeometry args={[1.12, 0.12, 0.74]} />
        <meshStandardMaterial color="#5A2A00" roughness={0.55} />
      </mesh>
    </group>
  );
}

// ── 판사옷 (Judge Robe) ───────────────────────────────────────────
function JudgeRobe({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  const sv = useRef(0);
  const by = useRef(-5);

  useFrame((state, dt) => {
    const active = phaseRef.current === 1;
    sv.current = THREE.MathUtils.lerp(sv.current, active ? 1.0 : 0, dt * 3);
    by.current = THREE.MathUtils.lerp(by.current, active ? 0 : -5, dt * 3);
    g.current.scale.setScalar(sv.current);
    g.current.position.set(0, by.current + Math.sin(state.clock.elapsedTime * 0.7 + 1) * 0.07, 0);
    g.current.rotation.y = state.clock.elapsedTime * 0.32;
  });

  return (
    <group ref={g} scale={0} position={[0, -5, 0]}>
      {/* 가운 본체 */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.88, 0.55, 3.0, 28]} />
        <meshStandardMaterial color="#0a0e15" roughness={0.9} />
      </mesh>
      {/* 버건디 가슴 패널 */}
      <mesh position={[0, 0.65, 0.72]}>
        <boxGeometry args={[0.36, 1.1, 0.06]} />
        <meshStandardMaterial color="#4A0010" roughness={0.75} />
      </mesh>
      {/* 왼쪽 어깨 */}
      <mesh position={[-0.92, 1.08, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.32, 0.23, 0.55, 20]} />
        <meshStandardMaterial color="#0a0e15" roughness={0.9} />
      </mesh>
      {/* 오른쪽 어깨 */}
      <mesh position={[0.92, 1.08, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.32, 0.23, 0.55, 20]} />
        <meshStandardMaterial color="#0a0e15" roughness={0.9} />
      </mesh>
      {/* 흰 칼라 */}
      <mesh position={[0, 1.22, 0.08]}>
        <cylinderGeometry args={[0.36, 0.4, 0.32, 22]} />
        <meshStandardMaterial color="#e8e8e2" roughness={0.65} />
      </mesh>
      {/* 칼라 주름 링 */}
      <mesh position={[0, 1.38, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.042, 12, 32]} />
        <meshStandardMaterial color="#ccccca" roughness={0.7} />
      </mesh>
      {/* 어깨선 금장 */}
      <mesh position={[0, 1.02, 0]}>
        <torusGeometry args={[0.88, 0.022, 12, 32]} />
        <meshStandardMaterial color="#D4A017" roughness={0.18} metalness={0.82} />
      </mesh>
      {/* 허리 금장 */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.77, 0.018, 12, 32]} />
        <meshStandardMaterial color="#D4A017" roughness={0.18} metalness={0.82} />
      </mesh>
    </group>
  );
}

// ── 재판장 의자 (Court Chair) ─────────────────────────────────────
function CourtChair({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  const sv = useRef(0);
  const by = useRef(-5);

  useFrame((state, dt) => {
    const active = phaseRef.current === 2;
    sv.current = THREE.MathUtils.lerp(sv.current, active ? 0.95 : 0, dt * 3);
    by.current = THREE.MathUtils.lerp(by.current, active ? 0 : -5, dt * 3);
    g.current.scale.setScalar(sv.current);
    g.current.position.set(0, by.current + Math.sin(state.clock.elapsedTime * 0.6 + 2) * 0.07, 0);
    g.current.rotation.y = state.clock.elapsedTime * 0.28;
  });

  const legs: [number, number][] = [[-0.52, -0.52], [0.52, -0.52], [-0.52, 0.52], [0.52, 0.52]];

  return (
    <group ref={g} scale={0} position={[0, -5, 0]}>
      {/* 좌판 프레임 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.22, 0.1, 1.08]} />
        <meshStandardMaterial color="#2C1810" roughness={0.38} metalness={0.1} />
      </mesh>
      {/* 좌판 쿠션 — 크림슨 */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.08, 0.14, 0.94]} />
        <meshStandardMaterial color="#8B0000" roughness={0.88} />
      </mesh>
      {/* 등받이 프레임 */}
      <mesh position={[0, 1.0, -0.56]}>
        <boxGeometry args={[1.22, 1.6, 0.1]} />
        <meshStandardMaterial color="#2C1810" roughness={0.38} metalness={0.1} />
      </mesh>
      {/* 등받이 쿠션 — 크림슨 */}
      <mesh position={[0, 1.0, -0.51]}>
        <boxGeometry args={[1.08, 1.46, 0.07]} />
        <meshStandardMaterial color="#8B0000" roughness={0.88} />
      </mesh>
      {/* 상단 크레스트 금장 */}
      <mesh position={[0, 1.83, -0.52]}>
        <boxGeometry args={[1.22, 0.07, 0.14]} />
        <meshStandardMaterial color="#D4A017" roughness={0.18} metalness={0.82} />
      </mesh>
      {/* 다이아몬드 엠블럼 — 금 */}
      <mesh position={[0, 1.05, -0.47]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.38, 0.38, 0.04]} />
        <meshStandardMaterial color="#D4A017" roughness={0.18} metalness={0.82} />
      </mesh>
      {/* 다이아몬드 엠블럼 — 청색 내부 */}
      <mesh position={[0, 1.05, -0.44]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.22, 0.22, 0.04]} />
        <meshStandardMaterial color="#1a3a6b" roughness={0.55} metalness={0.3} />
      </mesh>
      {/* 다리 4개 */}
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.72, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.34, 12]} />
          <meshStandardMaterial color="#4A2800" roughness={0.42} />
        </mesh>
      ))}
      {/* 팔걸이 수평 */}
      <mesh position={[-0.68, 0.32, -0.06]}>
        <boxGeometry args={[0.09, 0.07, 0.94]} />
        <meshStandardMaterial color="#5A3020" roughness={0.42} />
      </mesh>
      <mesh position={[0.68, 0.32, -0.06]}>
        <boxGeometry args={[0.09, 0.07, 0.94]} />
        <meshStandardMaterial color="#5A3020" roughness={0.42} />
      </mesh>
      {/* 팔걸이 받침 */}
      <mesh position={[-0.68, 0.01, -0.06]}>
        <boxGeometry args={[0.07, 0.58, 0.07]} />
        <meshStandardMaterial color="#4A2800" roughness={0.42} />
      </mesh>
      <mesh position={[0.68, 0.01, -0.06]}>
        <boxGeometry args={[0.07, 0.58, 0.07]} />
        <meshStandardMaterial color="#4A2800" roughness={0.42} />
      </mesh>
    </group>
  );
}

// ── 3D 씬 ─────────────────────────────────────────────────────────
function Scene({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  return (
    <>
      <color attach="background" args={['#06090f']} />
      <fog attach="fog" args={['#06090f', 10, 30]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 8, 5]} intensity={2.5} color="#fff8e8" castShadow />
      <pointLight position={[-5, 3, 3]} intensity={2.2} color="#c0392b" distance={20} />
      <pointLight position={[5, 2, -1]} intensity={1.8} color="#f1c40f" distance={20} />
      {/* 뒤에서 오는 림 라이트 — 어두운 오브젝트를 배경에서 분리 */}
      <pointLight position={[0, 0, -5.5]} intensity={5.0} color="#d8eaff" distance={18} />
      <pointLight position={[0, -3, 4]} intensity={1.0} color="#5bc8fa" distance={14} />
      <Particles />
      <Gavel phaseRef={phaseRef} />
      <JudgeRobe phaseRef={phaseRef} />
      <CourtChair phaseRef={phaseRef} />
    </>
  );
}

// ── 텍스트 패널 애니메이션 ────────────────────────────────────────
const panelVariants = {
  enter: (side: 'left' | 'right') => ({
    opacity: 0,
    x: side === 'left' ? -60 : 60,
  }),
  center: { opacity: 1, x: 0 },
  exit: (side: 'left' | 'right') => ({
    opacity: 0,
    x: side === 'left' ? -40 : 40,
  }),
};

// ══════════════════════════════════════════════════════════════════
// 메인 페이지
// ══════════════════════════════════════════════════════════════════
export default function AboutPage() {
  const [mounted, setMounted]           = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const phaseRef   = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { phaseRef.current = currentPhase; }, [currentPhase]);

  // 스크롤 진행률 → 페이즈 전환
  useEffect(() => {
    if (!mounted) return;
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect      = el.getBoundingClientRect();
      const stickyH   = window.innerHeight - 64; // 헤더 4rem
      const scrolled  = -rect.top;
      const totalScroll = rect.height - stickyH;
      const p = Math.max(0, Math.min(1, scrolled / totalScroll));
      const next = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
      if (next !== phaseRef.current) setCurrentPhase(next);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mounted]);

  const phase = PHASES[currentPhase];

  return (
    <div className="bg-[#06090f]">

      {/* ── 히어로 ──────────────────────────────────────────────── */}
      <section className="h-[92vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-yellow-primary/6 rounded-full blur-[80px]" />
        </div>
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs font-bold text-yellow-primary uppercase tracking-[0.35em] mb-5">
            2026 · 제 3회
          </p>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-5 leading-[0.95] tracking-tight">
            오량<br />모의국회
          </h1>
          <p className="text-gray-400 text-base md:text-lg mb-10">
            정책 기반 사회 문제 해결 · 2026.05.29 ~ 08.01
          </p>
          <motion.div
            className="flex flex-col items-center gap-2 text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            <span className="text-sm tracking-widest uppercase">Scroll</span>
            <ArrowDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 스크롤 드리븐 3D 섹션 (500vh) ───────────────────────── */}
      <div ref={containerRef} style={{ height: '500vh' }}>
        <div
          className="sticky top-16 overflow-hidden"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          {/* 3D 캔버스 — 전체 채움 */}
          {mounted && (
            <Canvas
              camera={{ position: [0, 0.8, 5.5], fov: 44 }}
              gl={{ antialias: true, alpha: false }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <Scene phaseRef={phaseRef as React.RefObject<number>} />
            </Canvas>
          )}

          {/* 텍스트 오버레이 */}
          <div className="relative z-10 w-full h-full pointer-events-none flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase}
                custom={phase.side}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute max-w-[280px] md:max-w-xs px-5 ${
                  phase.side === 'left'
                    ? 'left-4 md:left-10 lg:left-16'
                    : 'right-4 md:right-10 lg:right-16'
                }`}
              >
                <p className="text-[10px] font-bold text-yellow-primary uppercase tracking-[0.28em] mb-2">
                  {phase.label}
                </p>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white mb-4 leading-snug">
                  {phase.title}
                </h2>
                <ul className="space-y-2.5">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-300 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            {/* 오브젝트 인디케이터 */}
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2.5">
              {PHASES.map((p, i) => (
                <div
                  key={i}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-500 ${
                    currentPhase === i
                      ? 'bg-yellow-primary text-gray-900 scale-110 shadow-[0_0_16px_rgba(241,196,15,0.55)]'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {p.object}
                </div>
              ))}
            </div>

            {/* 세로 진행 바 */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
              {PHASES.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-500 ${
                    currentPhase === i
                      ? 'w-1.5 h-8 bg-yellow-primary shadow-[0_0_8px_rgba(241,196,15,0.6)]'
                      : 'w-1 h-3 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 푸터 ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6 text-center border-t border-white/5">
        <p className="text-gray-700 text-sm">제 3회 오량모의국회 · 2026</p>
      </section>

    </div>
  );
}
