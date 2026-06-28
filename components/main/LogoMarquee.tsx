"use client";
import Image from 'next/image';

const CLUBS = [
  { src: '/clubs/dcn.png',               alt: 'DCN' },
  { src: '/clubs/doyl.png',              alt: 'DOYL' },
  { src: '/clubs/flow-communicators.png',alt: 'Flow Communicators' },
  { src: '/clubs/nalssam.png',           alt: 'NALSSAM' },
  { src: '/clubs/one-press.png',         alt: 'ONE-PRESS' },
  { src: '/clubs/path-finder.png',       alt: 'Path Finder' },
  { src: '/clubs/inspire.png',           alt: 'Inspire' },
  { src: '/clubs/gyojiphap.png',         alt: '교집합' },
  { src: '/clubs/eunoia.png',            alt: 'EUNOIA' },
  { src: '/clubs/right-us.png',          alt: 'Right-us' },
  { src: '/clubs/unify.png',             alt: 'UNIFY' },
  { src: '/clubs/link.png',              alt: 'L-INK' },
];

const ALL_CLUBS = [...CLUBS, ...CLUBS];

export default function LogoMarquee() {
  return (
    <div className="w-full overflow-hidden py-10 bg-gray-50 dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border">
      <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-6 tracking-widest uppercase">
        참여 동아리
      </p>
      <div className="relative flex overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />

        <div
          className="flex items-center gap-12 w-max"
          style={{ animation: 'marquee 35s linear infinite' }}
        >
          {ALL_CLUBS.map((club, idx) => (
            <div
              key={idx}
              className="shrink-0 flex items-center justify-center w-24 h-16"
            >
              <Image
                src={club.src}
                alt={club.alt}
                width={96}
                height={64}
                unoptimized
                className="object-contain w-full h-full club-logo"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
