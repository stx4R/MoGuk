'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Info, Calendar, UserCheck, Flag, GitBranch, Star, Mic, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';

// ── Section → Phase 매핑 ──────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',   title: '대회 개요',   Icon: Info,      phase: 0 },
  { id: 'schedule',   title: '전체 일정',   Icon: Calendar,  phase: 0 },
  { id: 'roles',      title: '참가자 역할', Icon: UserCheck, phase: 1 },
  { id: 'parties',    title: '정당 구성',   Icon: Flag,      phase: 1 },
  { id: 'process',    title: '활동 흐름',   Icon: GitBranch, phase: 2 },
  { id: 'evaluation', title: '평가 기준',   Icon: Star,      phase: 2 },
  { id: 'speeches',   title: '본회의 발언', Icon: Mic,       phase: 2 },
];

const PHASE_LABELS  = ['대회 기본 정보', '참가자 구성', '활동 과정'];
const PHASE_OBJECTS = ['법봉', '판사옷', '의자'];

// ── 테이블 스타일 헬퍼 ────────────────────────────────────────────
const th = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-surface';
const td = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-dark-border';
const tbl = 'w-full border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden';

// ── 섹션별 콘텐츠 ─────────────────────────────────────────────────
const CONTENT: Record<string, React.ReactNode> = {
  overview: (
    <div className="divide-y divide-gray-100 dark:divide-dark-border rounded-xl border border-gray-200 dark:border-dark-border px-5 py-1">
      {[
        ['활동 주제', '정책 기반 사회 문제 해결'],
        ['기간',     '2026.05.29 (금) ~ 08.01 (토)'],
        ['장소',     '대전대신고등학교 1·2학년 교실, 백암관'],
        ['운영진',   '35명'],
        ['참가 규모','약 130명 (진보 40 · 보수 40 · 중도 50)'],
      ].map(([label, value]) => (
        <div key={label} className="flex gap-3 py-3">
          <span className="w-24 shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
        </div>
      ))}
    </div>
  ),

  schedule: (
    <div className={tbl}>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>일시</th>
            <th className={th}>활동명</th>
            <th className={th}>내용</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-bg">
          {[
            ['03/30 ~ 04/03', '참가자 모집',  '각 동아리별 참가자 모집'],
            ['04/05 ~ 04/06', '행정 처리',    '참가자 선정, 특방 입장 (온라인)'],
            ['05/29 (금)',     '개회식',       '개회식 / 대전대신고'],
            ['05/29 ~ 07/24', '탐구 기간',    '정책 탐구 및 구체화 / Zoom'],
            ['05/29 ~ 07/24', '멘토링',       '멘토 피드백 및 갈등의 전략적 조언'],
            ['07/25 (토)',     '상임위원회',   '안건 심의·토론 / 대전대신고'],
            ['08/01 (토)',     '본회의',       '제안설명 → 질의/토론 → 전자 투표 표결 → 시상 / 대전대신고'],
          ].map(([date, name, desc]) => (
            <tr key={date}>
              <td className={cn(td, 'font-semibold text-red-primary dark:text-yellow-primary whitespace-nowrap')}>{date}</td>
              <td className={td}>{name}</td>
              <td className={cn(td, 'text-gray-500 dark:text-gray-400')}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),

  roles: (
    <div className="space-y-3">
      {[
        { role: '위원회 위원 / 국회의원', desc: '모든 참가자에게 공통으로 적용되는 기본 역할. 안건 탐구·제출·심의·투표에 참여한다.' },
        { role: '교섭단체 간사', desc: '상임위 협의를 위한 회의단체 대표. 교섭단체 소속 회원 중 선발.' },
        { role: '원내대표', desc: '의회에서 소속 당을 대표하여 발언하고 의사결정을 이끄는 역할.' },
        { role: '당대표', desc: '정당별 과제 제출을 독려하고 멘토링을 담당하는 리더십 역할.' },
      ].map(({ role, desc }) => (
        <div key={role} className="flex gap-4 p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-red-primary dark:bg-yellow-primary shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{role}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  ),

  parties: (
    <div className={tbl}>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>구분</th>
            <th className={cn(th, 'text-blue-500')}>진보</th>
            <th className={cn(th, 'text-red-primary')}>보수</th>
            <th className={cn(th, 'text-yellow-primary')}>중도</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-bg">
          {[
            ['이념', '친 학생·노동자·외곽', '친 학교·기업·도심', '개인별 상이'],
            ['인원', '약 40명', '약 40명', '약 50명'],
            ['당대표', '조연재', '정재욱', '황성연'],
          ].map(([label, ...vals]) => (
            <tr key={label}>
              <td className={cn(td, 'font-semibold text-gray-600 dark:text-gray-300')}>{label}</td>
              {vals.map((v, i) => <td key={i} className={td}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),

  process: (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {['의안 탐구', '의안 제출', '상임위원회', '본회의'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary border border-red-primary/20 dark:border-yellow-primary/20">
              {step}
            </span>
            {i < arr.length - 1 && <span className="text-gray-300 dark:text-gray-600">→</span>}
          </div>
        ))}
      </div>
      {[
        { step: '의안 탐구', date: '05.29 ~ 07.24', desc: '상임위 주제에 맞는 회의안을 온라인(Zoom)으로 조사·구체화. 작성 기간 약 15일.' },
        { step: '의안 제출', date: '상임위 전',       desc: '상임위 피드백과 자구심사를 거쳐 본회의에 제출. 정책위원회 검토를 통해 최종 안건 확정.' },
        { step: '상임위원회', date: '07.25 (토)',     desc: '안건 심의·토론 후 본회의 상정 여부 결정. 교섭단체 간사 및 위원장 주도로 진행.' },
        { step: '본회의',    date: '08.01 (토)',     desc: '제안설명 → 질의·찬반 토론 → 전자 투표 표결 → 시상. 통과된 안건은 결과로 발표.' },
      ].map(({ step, date, desc }) => (
        <div key={step} className="flex gap-5 p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
          <div className="shrink-0 text-right w-24">
            <p className="font-bold text-red-primary dark:text-yellow-primary text-sm">{step}</p>
            <p className="text-xs text-gray-400 mt-0.5">{date}</p>
          </div>
          <div className="border-l border-gray-200 dark:border-dark-border pl-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  ),

  evaluation: (
    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
      <div className="rounded-xl border border-yellow-primary/30 bg-yellow-primary/5 p-5">
        <h3 className="font-bold text-yellow-primary mb-4 text-sm flex items-center gap-1"><span className="text-lg">＋</span> 가점</h3>
        <ul className="space-y-3">
          {[['정책·법안이 본회의에 정식 상정됨', '+20'], ['제안 정책에 대한 이해도와 논리적 적절성', '+10'], ['정당 이념 및 주제와의 부합성', '+10'], ['회의 전반에 대한 참여도', '+10~20'], ['질의응답에 근거가 적절함', '+10~20']].map(([item, score]) => (
            <li key={item} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
              <span className="shrink-0 font-bold text-yellow-primary">{score}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-red-primary/30 bg-red-primary/5 p-5">
        <h3 className="font-bold text-red-primary mb-4 text-sm flex items-center gap-1"><span className="text-lg">－</span> 감점</h3>
        <ul className="space-y-3">
          {[['정책 제안서 또는 관련 자료 미제출', '−10'], ['정책에 대한 이해 부족 또는 당론 배치', '−10'], ['정책 내용 사실 오류 또는 논리 비약', '−10'], ['회의 과정에서 불성실한 태도 (횟수당)', '−10'], ['참가자 비방·모욕 등 회의장 모독 (발언당)', '−20']].map(([item, score]) => (
            <li key={item} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
              <span className="shrink-0 font-bold text-red-primary">{score}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-400 leading-relaxed">※ 감점 사항은 정책위원회 직권 설정. 중복 감점 가능.</p>
      </div>
    </div>
  ),

  speeches: (
    <div className="space-y-4">
      {[
        { title: '5분 자유발언',   badge: '회기 전 서면 신청',  desc: '의원이 관심 의안·청원 등에 대해 자유롭게 의견을 말하는 발언. 간사 협의 필요. 5분 이내.' },
        { title: '신상 발언',      badge: '회기 중 서면 신청',  desc: '의원 일신상 문제가 생긴 경우 본인이 해명하는 발언. 5분 이내.' },
        { title: '의사진행 발언',  badge: '본회의 중 서면 신청', desc: '회의 진행 방법에 이의를 제기하거나 의견을 개진하기 위한 발언. 5분 이내. 반론 발언 가능 (5분 이내).' },
      ].map(({ title, badge, desc }) => (
        <div key={title} className="p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-gray-900 dark:text-white text-sm">{title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-primary/10 text-red-primary dark:bg-yellow-primary/10 dark:text-yellow-primary">{badge}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
  ),
};

// ══════════════════════════════════════════════════════════════════
// 3D 모델 컴포넌트
// ══════════════════════════════════════════════════════════════════

// ── 황금빛 파티클 배경 ────────────────────────────────────────────
function Particles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 220;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 28;
    return arr;
  }, []);
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.04; ref.current.rotation.x += dt * 0.015; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#f1c40f" transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

// ── 법봉 (Gavel) ──────────────────────────────────────────────────
function Gavel({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((state, dt) => {
    const active = phaseRef.current === 0;
    const targetScale = active ? 1 : 0;
    const targetY     = active ? 0 : -6;
    g.current.scale.setScalar(THREE.MathUtils.lerp(g.current.scale.x, targetScale, dt * 2.8));
    g.current.position.y = THREE.MathUtils.lerp(g.current.position.y, targetY, dt * 2.8);
    g.current.rotation.y = state.clock.elapsedTime * 0.45;
    // 느리게 위아래 부유
    g.current.position.y += Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
  });
  return (
    <group ref={g} scale={0} position={[0, -6, 0]}>
      {/* 자루 */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.095, 1.9, 20]} />
        <meshStandardMaterial color="#9B6B3A" roughness={0.28} metalness={0.06} />
      </mesh>
      {/* 머리 */}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.225, 0.225, 0.98, 20]} />
        <meshStandardMaterial color="#3A1C00" roughness={0.14} metalness={0.1} />
      </mesh>
      {/* 머리 양쪽 금속 캡 */}
      <mesh position={[0.535, 0.62, 0]}>
        <cylinderGeometry args={[0.228, 0.228, 0.04, 20]} />
        <meshStandardMaterial color="#C9900A" roughness={0.18} metalness={0.75} />
      </mesh>
      <mesh position={[-0.535, 0.62, 0]}>
        <cylinderGeometry args={[0.228, 0.228, 0.04, 20]} />
        <meshStandardMaterial color="#C9900A" roughness={0.18} metalness={0.75} />
      </mesh>
      {/* 타격판 */}
      <mesh position={[0, -1.65, 0]}>
        <boxGeometry args={[1.05, 0.13, 0.68]} />
        <meshStandardMaterial color="#7B3800" roughness={0.52} />
      </mesh>
      {/* 타격판 중앙 장식 */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[0.72, 0.06, 0.44]} />
        <meshStandardMaterial color="#D2691E" roughness={0.6} />
      </mesh>
      {/* 자루-머리 연결 금속 링 */}
      <mesh position={[0, 0.18, 0]}>
        <torusGeometry args={[0.1, 0.02, 10, 24]} />
        <meshStandardMaterial color="#C9900A" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ── 판사옷 (Judge Robe) ───────────────────────────────────────────
function JudgeRobe({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((state, dt) => {
    const active = phaseRef.current === 1;
    const targetScale = active ? 1 : 0;
    const targetY     = active ? 0 : -6;
    g.current.scale.setScalar(THREE.MathUtils.lerp(g.current.scale.x, targetScale, dt * 2.8));
    g.current.position.y = THREE.MathUtils.lerp(g.current.position.y, targetY, dt * 2.8);
    g.current.rotation.y = state.clock.elapsedTime * 0.32;
    g.current.position.y += Math.sin(state.clock.elapsedTime * 0.7 + 1) * 0.06;
  });
  return (
    <group ref={g} scale={0} position={[0, -6, 0]}>
      {/* 가운 본체 (위로 갈수록 넓어짐) */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.82, 0.52, 2.9, 24]} />
        <meshStandardMaterial color="#0d1117" roughness={0.86} />
      </mesh>
      {/* 왼쪽 어깨 */}
      <mesh position={[-0.88, 1.05, 0]} rotation={[0, 0, -0.28]}>
        <cylinderGeometry args={[0.31, 0.22, 0.52, 18]} />
        <meshStandardMaterial color="#0d1117" roughness={0.86} />
      </mesh>
      {/* 오른쪽 어깨 */}
      <mesh position={[0.88, 1.05, 0]} rotation={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.31, 0.22, 0.52, 18]} />
        <meshStandardMaterial color="#0d1117" roughness={0.86} />
      </mesh>
      {/* 흰 칼라 */}
      <mesh position={[0, 1.18, 0.06]}>
        <cylinderGeometry args={[0.33, 0.37, 0.3, 20]} />
        <meshStandardMaterial color="#e8e8e2" roughness={0.6} />
      </mesh>
      {/* 칼라 윗 링 */}
      <mesh position={[0, 1.34, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.04, 10, 28]} />
        <meshStandardMaterial color="#ccccca" roughness={0.65} />
      </mesh>
      {/* 가운 어깨선 금장 트림 */}
      <mesh position={[0, 1.0, 0]}>
        <torusGeometry args={[0.84, 0.022, 10, 28]} />
        <meshStandardMaterial color="#C9900A" roughness={0.18} metalness={0.82} />
      </mesh>
      {/* 가운 허리 금장 트림 */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.74, 0.018, 10, 28]} />
        <meshStandardMaterial color="#C9900A" roughness={0.18} metalness={0.82} />
      </mesh>
    </group>
  );
}

// ── 재판장 의자 (Court Chair) ─────────────────────────────────────
function CourtChair({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((state, dt) => {
    const active = phaseRef.current === 2;
    const targetScale = active ? 1 : 0;
    const targetY     = active ? 0 : -6;
    g.current.scale.setScalar(THREE.MathUtils.lerp(g.current.scale.x, targetScale, dt * 2.8));
    g.current.position.y = THREE.MathUtils.lerp(g.current.position.y, targetY, dt * 2.8);
    g.current.rotation.y = state.clock.elapsedTime * 0.28;
    g.current.position.y += Math.sin(state.clock.elapsedTime * 0.6 + 2) * 0.06;
  });
  const legs: [number, number][] = [[-0.49, -0.49], [0.49, -0.49], [-0.49, 0.49], [0.49, 0.49]];
  return (
    <group ref={g} scale={0} position={[0, -6, 0]}>
      {/* 좌판 프레임 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.18, 0.1, 1.04]} />
        <meshStandardMaterial color="#2C1810" roughness={0.38} metalness={0.1} />
      </mesh>
      {/* 좌판 쿠션 */}
      <mesh position={[0, 0.115, 0]}>
        <boxGeometry args={[1.04, 0.14, 0.9]} />
        <meshStandardMaterial color="#1a4a20" roughness={0.88} />
      </mesh>
      {/* 등받이 프레임 */}
      <mesh position={[0, 0.9, -0.54]}>
        <boxGeometry args={[1.18, 1.5, 0.1]} />
        <meshStandardMaterial color="#2C1810" roughness={0.38} metalness={0.1} />
      </mesh>
      {/* 등받이 쿠션 */}
      <mesh position={[0, 0.9, -0.49]}>
        <boxGeometry args={[1.04, 1.36, 0.07]} />
        <meshStandardMaterial color="#1a4a20" roughness={0.88} />
      </mesh>
      {/* 등받이 상단 금장 */}
      <mesh position={[0, 1.67, -0.5]}>
        <boxGeometry args={[1.18, 0.07, 0.13]} />
        <meshStandardMaterial color="#C9900A" roughness={0.18} metalness={0.82} />
      </mesh>
      {/* 다리 4개 */}
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.68, z]}>
          <cylinderGeometry args={[0.058, 0.058, 1.26, 10]} />
          <meshStandardMaterial color="#4A2800" roughness={0.42} />
        </mesh>
      ))}
      {/* 왼쪽 팔걸이 */}
      <mesh position={[-0.65, 0.3, -0.06]}>
        <boxGeometry args={[0.09, 0.07, 0.9]} />
        <meshStandardMaterial color="#6B3A2A" roughness={0.42} />
      </mesh>
      {/* 오른쪽 팔걸이 */}
      <mesh position={[0.65, 0.3, -0.06]}>
        <boxGeometry args={[0.09, 0.07, 0.9]} />
        <meshStandardMaterial color="#6B3A2A" roughness={0.42} />
      </mesh>
      {/* 팔걸이 받침대 (왼쪽) */}
      <mesh position={[-0.65, 0.0, -0.06]}>
        <boxGeometry args={[0.07, 0.56, 0.07]} />
        <meshStandardMaterial color="#4A2800" roughness={0.42} />
      </mesh>
      {/* 팔걸이 받침대 (오른쪽) */}
      <mesh position={[0.65, 0.0, -0.06]}>
        <boxGeometry args={[0.07, 0.56, 0.07]} />
        <meshStandardMaterial color="#4A2800" roughness={0.42} />
      </mesh>
    </group>
  );
}

// ── 3D 씬 ─────────────────────────────────────────────────────────
function Scene({ phaseRef }: { phaseRef: React.RefObject<number> }) {
  return (
    <>
      <color attach="background" args={['#080c14']} />
      <fog attach="fog" args={['#080c14', 9, 26]} />
      {/* 조명 */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[3.5, 7, 5]} intensity={2.2} color="#fff8e8" castShadow />
      <pointLight position={[-5, 3, 2]}  intensity={2.0} color="#c0392b" distance={18} />
      <pointLight position={[5, 2, -1]}  intensity={1.6} color="#f1c40f" distance={18} />
      <pointLight position={[0, -2, 4]}  intensity={0.9} color="#5bc8fa" distance={14} />
      <Particles />
      <Gavel     phaseRef={phaseRef} />
      <JudgeRobe phaseRef={phaseRef} />
      <CourtChair phaseRef={phaseRef} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// 메인 페이지 컴포넌트
// ══════════════════════════════════════════════════════════════════
export default function AboutPage() {
  const [mounted, setMounted]           = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const phaseRef = useRef<number>(0);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => setMounted(true), []);

  // phaseRef 동기화 (Canvas 리렌더 없이 3D가 참조)
  useEffect(() => { phaseRef.current = currentPhase; }, [currentPhase]);

  // IntersectionObserver — 어느 섹션이 뷰포트 중앙에 있는지 감지
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const s = SECTIONS.find(x => x.id === entry.target.id);
            if (s !== undefined) setCurrentPhase(s.phase);
          }
        }
      },
      { rootMargin: '-30% 0px -30% 0px' }
    );
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <div>

      {/* ── 히어로 섹션 ──────────────────────────────────────────── */}
      <section className="h-[92vh] flex flex-col items-center justify-center text-center px-4 bg-[#080c14] relative overflow-hidden">
        {/* 배경 글로우 */}
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

      {/* ── 페이즈 탐색 바 ───────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-[#080c14]/95 backdrop-blur-md border-b border-white/8">
        <div className="max-w-none px-4 md:px-8 flex items-center gap-4 md:gap-8 py-3">
          {PHASE_LABELS.map((label, i) => (
            <div key={i} className={cn(
              'flex items-center gap-2.5 text-xs font-semibold transition-all duration-500',
              currentPhase === i ? 'text-yellow-primary' : 'text-gray-600'
            )}>
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500',
                currentPhase === i
                  ? 'bg-yellow-primary text-gray-900 shadow-[0_0_10px_rgba(241,196,15,0.5)]'
                  : 'bg-white/8 text-gray-600'
              )}>
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {i < 2 && <span className="text-gray-700 hidden sm:inline">›</span>}
            </div>
          ))}
          <div className="ml-auto hidden md:flex items-center gap-2 text-xs">
            <span className="text-gray-600">현재:</span>
            <span className={cn(
              'font-bold px-2.5 py-0.5 rounded-full text-gray-900 transition-all duration-500',
              'bg-yellow-primary shadow-[0_0_12px_rgba(241,196,15,0.4)]'
            )}>
              {PHASE_OBJECTS[currentPhase]}
            </span>
          </div>
        </div>
      </div>

      {/* ── 메인: 콘텐츠(좌) + 3D 캔버스(우) ─────────────────────── */}
      <div className="flex">

        {/* 콘텐츠 열 */}
        <div className="flex-1 min-w-0">
          {SECTIONS.map(({ id, title, Icon }) => (
            <section
              key={id}
              id={id}
              ref={el => { sectionRefs.current[id] = el; }}
              className="min-h-screen py-20 px-6 md:px-12 lg:px-16 bg-white dark:bg-dark-bg border-b border-gray-100 dark:border-dark-border"
            >
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-12%' }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-xl bg-red-primary/10 dark:bg-yellow-primary/10">
                    <Icon size={18} className="text-red-primary dark:text-yellow-primary" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{title}</h2>
                </div>
                {CONTENT[id]}
              </motion.div>
            </section>
          ))}
        </div>

        {/* 3D 캔버스 열 — 데스크탑 전용, sticky */}
        <div className="hidden md:block w-[44%] shrink-0 sticky top-[calc(4rem+2.75rem)] self-start h-[calc(100vh-6.75rem)]">
          {mounted && (
            <Canvas
              camera={{ position: [0, 1.2, 5.8], fov: 44 }}
              gl={{ antialias: true, alpha: false }}
              style={{ width: '100%', height: '100%' }}
            >
              <Scene phaseRef={phaseRef as React.RefObject<number>} />
            </Canvas>
          )}

          {/* 오브젝트 전환 인디케이터 */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2.5 pointer-events-none">
            {PHASE_OBJECTS.map((obj, i) => (
              <div
                key={i}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-600',
                  currentPhase === i
                    ? 'bg-yellow-primary text-gray-900 scale-110 shadow-[0_0_16px_rgba(241,196,15,0.6)]'
                    : 'bg-white/10 text-white/35 scale-100'
                )}
              >
                {obj}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
