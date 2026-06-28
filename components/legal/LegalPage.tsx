// 정책 문서 공용 레이아웃 — orya.ng/terms 형식 (단일 컬럼, 제N조 + 구분선 + 번호 조항) S
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export type Clause = {
  label?: string;   // '가', '나', '1' 등 — 없으면 들여쓰기 없는 단락
  text: string;
  sub?: string[];   // 1, 2, 3 … 하위 항목
};

export type Article = {
  no: number;
  title: string;
  clauses: Clause[];
};

export type LegalPageProps = {
  title: string;
  updated: string;
  effective: string;
  intro?: string;
  articles: Article[];
  footnote?: string;
};

export default function LegalPage({ title, updated, effective, intro, articles, footnote }: LegalPageProps) {
  return (
    <div className="max-w-[760px] mx-auto px-6 py-14 md:py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary hover:text-text-base mb-8 transition-colors"
      >
        <ArrowLeft size={15} />
        홈으로
      </Link>

      <h1 className="text-[clamp(28px,5vw,38px)] font-extrabold tracking-[-0.02em] text-text-base leading-tight">
        {title}
      </h1>
      <p className="mt-3 text-[13px] text-text-secondary">
        최종 업데이트: {updated} <span className="px-1.5 text-border">·</span> 시행일: {effective}
      </p>

      {intro && (
        <p className="mt-7 text-[15px] leading-[1.75] text-text-near-white whitespace-pre-line">
          {intro}
        </p>
      )}

      <div className="mt-10 space-y-9">
        {articles.map((a) => (
          <section key={a.no}>
            <div className="border-t border-[var(--hairline-strong)] pt-6">
              <h2 className="text-[18px] font-bold text-text-base">
                제{a.no}조 <span className="text-text-near-white">({a.title})</span>
              </h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {a.clauses.map((c, i) => (
                <div key={i} className="flex gap-2.5 text-[14.5px] leading-[1.7] text-text-secondary">
                  {c.label && (
                    <span className="shrink-0 font-semibold text-text-near-white min-w-[1.1rem]">
                      {c.label}.
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-line">{c.text}</p>
                    {c.sub && c.sub.length > 0 && (
                      <ul className="mt-2 space-y-1.5 pl-0.5">
                        {c.sub.map((s, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="shrink-0 text-border">{j + 1}.</span>
                            <span className="flex-1">{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {footnote && (
        <p className="mt-12 pt-6 border-t border-[var(--hairline)] text-[12.5px] leading-relaxed text-[#6f6f6f] whitespace-pre-line">
          {footnote}
        </p>
      )}
    </div>
  );
}
