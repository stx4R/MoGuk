"use client";
// 동아리 로고 무한 마키 — 원본 이미지 그대로, GPU 가속 끊김 없는 루프 S
import Image from 'next/image';

const CLUBS = [
  { src: '/clubs/dcn.jpg',                alt: 'DCN' },
  { src: '/clubs/doyl.png',               alt: 'DOYL' },
  { src: '/clubs/flow-communicators.jpg', alt: 'Flow Communicators' },
  { src: '/clubs/nalssam.png',            alt: 'NALSSAM' },
  { src: '/clubs/one-press.jpg',          alt: 'ONE-PRESS' },
  { src: '/clubs/path-finder.png',        alt: 'Path Finder' },
  { src: '/clubs/inspire.png',            alt: 'Inspire' },
  { src: '/clubs/gyojiphap.png',          alt: '교집합' },
  { src: '/clubs/eunoia.png',             alt: 'EUNOIA' },
  { src: '/clubs/right-us.jpg',           alt: 'Right-us' },
  { src: '/clubs/unify.png',              alt: 'UNIFY' },
  { src: '/clubs/link.png',               alt: 'L-INK' },
];

function ClubList() {
  return (
    // pr-12 = gap-12 과 동일 → 각 복사본 너비 정확히 일치, 루프 시 픽셀 오프셋 없음 S
    <div className="flex items-center gap-12 pr-12">
      {CLUBS.map((club, idx) => (
        <div key={idx} className="shrink-0 flex items-center justify-center w-24 h-16">
          <Image
            src={club.src}
            alt={club.alt}
            width={96}
            height={64}
            className="object-contain w-full h-full"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}

export default function LogoMarquee() {
  return (
    <div className="w-full overflow-hidden py-10 bg-gray-50 dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border">
      <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-6 tracking-widest uppercase">
        협력 동아리
      </p>
      <div className="relative overflow-hidden" style={{ contain: 'layout style' }}>
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />
        <div
          className="flex w-max"
          style={{
            animation: 'marquee 35s linear infinite',
            willChange: 'transform',
          }}
        >
          <ClubList />
          <ClubList />
        </div>
      </div>
    </div>
  );
}
