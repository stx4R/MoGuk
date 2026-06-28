import Link from 'next/link';
import Image from 'next/image';

const SITE_LINKS = [
  { label: '홈',      href: '/' },
  { label: '소개',    href: '/#about' },
  { label: '투표',    href: '/vote' },
];

const ABOUT_LINKS = [
  { label: '타임라인',   href: '/#timeline' },
  { label: '부서 소개',  href: '/#departments' },
  { label: '정당 소개',  href: '/#parties' },
  { label: '운영 절차',  href: '/#process' },
];

const DEV_LINKS = [
  { label: 'stx4R',   href: 'http://stx4r.me/' },
  { label: 'kmc',     href: 'https://github.com/kmc11004' },
  { label: 'heejae',  href: 'https://github.com/heejae0105' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--hairline)] bg-[#0d0d0d]">
      <div className="max-w-[var(--maxw)] mx-auto px-6 pt-14 pb-10">

        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">

          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-extrabold text-[17px] tracking-[-0.02em] text-text-base mb-4"
            >
              <span className="w-[30px] h-[30px] rounded-full bg-green flex items-center justify-center shrink-0">
                <Image
                  src="/moguk_logo.svg"
                  alt="오량모의국회"
                  width={22}
                  height={22}
                  className="brightness-0"
                />
              </span>
              오량모의국회
            </Link>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-[28ch]">
              제 3회 오량모의국회 공식 웹사이트입니다. 민주주의 체험과 토론 문화 발전을 목적으로 운영됩니다.
            </p>
          </div>

          {/* Col 2: 사이트 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">사이트</h4>
            <ul className="flex flex-col gap-2.5">
              {SITE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-text-secondary hover:text-text-base transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: 소개 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">소개</h4>
            <ul className="flex flex-col gap-2.5">
              {ABOUT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-text-secondary hover:text-text-base transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: 개발팀 */}
          <div>
            <h4 className="text-[13px] font-bold text-text-base mb-4">개발팀</h4>
            <ul className="flex flex-col gap-2.5">
              {DEV_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-text-secondary hover:text-green transition-colors duration-150"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--hairline)] mt-11 pt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-[#6f6f6f]">
            © 2026 제 3회 오량모의국회. All rights reserved.
          </p>
          <p className="text-[12px] text-[#6f6f6f]">
            Developed by{' '}
            {DEV_LINKS.map((l, i) => (
              <span key={l.label}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary font-semibold hover:text-green transition-colors"
                >
                  {l.label}
                </a>
                {i < DEV_LINKS.length - 1 && ' · '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
