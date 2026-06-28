import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <style>{`
        @keyframes spin-disc-hp { to { transform: rotate(360deg); } }
        @keyframes needle-in-hp { from { transform: rotate(-20deg); } to { transform: rotate(25deg); } }
        @keyframes fade-up-hp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .disc-hp { animation: spin-disc-hp 4s linear infinite; }
        .needle-hp { animation: needle-in-hp 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; transform-origin: top right; }
        .content-hp > * { animation: fade-up-hp 0.6s ease both; }
        .content-hp > *:nth-child(1) { animation-delay: 0.1s; }
        .content-hp > *:nth-child(2) { animation-delay: 0.22s; }
        .content-hp > *:nth-child(3) { animation-delay: 0.34s; }
        .content-hp > *:nth-child(4) { animation-delay: 0.46s; }
        .content-hp > *:nth-child(5) { animation-delay: 0.58s; }
      `}</style>

      <div className="relative w-44 h-44 mb-10 select-none">
        <div className="disc-hp w-44 h-44 rounded-full bg-[#1a1a1a] border-2 border-[#2a2a2a] flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.6)]">
          {[56, 80, 100, 124].map((d) => (
            <div key={d} className="absolute rounded-full border border-[#252525]" style={{ width: d, height: d }} />
          ))}
          <div className="relative z-10 w-14 h-14 rounded-full bg-[var(--green)] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            <span className="text-[9px] font-black text-black leading-tight tracking-tight text-center">MO<br />GUK</span>
          </div>
        </div>
        <div className="needle-hp absolute top-[-8px] right-[-10px]" style={{ width: 6, height: 64 }}>
          <div className="w-1 bg-gradient-to-b from-[#b0b0b0] to-[#888] rounded-full h-full mx-auto" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#aaa] border border-[#888] absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      <div className="content-hp space-y-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.07)] border border-[var(--hairline)] text-xs font-bold text-[var(--green)] tracking-widest uppercase">
          Error 410
        </span>
        <h1 className="text-[32px] font-black text-text-base leading-tight tracking-tight">
          도움말 서비스가<br />종료되었습니다
        </h1>
        <p className="text-sm text-text-secondary max-w-[36ch] mx-auto leading-relaxed">
          제 3회 오량모의국회 운영진들과의 회의를 통해<br />도움말 서비스가 종료되었습니다.
        </p>
        <p className="text-sm text-text-secondary max-w-[36ch] mx-auto leading-relaxed">
          불편사항을 겪고계신다면,<br />웹 관리자와 직접 연락해주십시오.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/" className="px-5 py-2.5 rounded-full bg-[var(--green)] text-black text-sm font-bold hover:brightness-110 transition-all">
            홈으로 가기
          </Link>
          <Link href="/vote" className="px-5 py-2.5 rounded-full border border-[var(--hairline)] text-text-secondary text-sm font-semibold hover:text-text-base hover:bg-surface-hover transition-all">
            투표 페이지
          </Link>
        </div>
      </div>
    </div>
  );
}
