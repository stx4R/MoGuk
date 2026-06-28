import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <style>{`
        @keyframes spin-disc { to { transform: rotate(360deg); } }
        @keyframes needle-in { from { transform: rotate(-20deg); } to { transform: rotate(25deg); } }
        @keyframes nf-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .nf-disc { animation: spin-disc 4s linear infinite; }
        .nf-needle { animation: needle-in 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; transform-origin: top right; }
        .nf-content > * { animation: nf-fade-up 0.6s ease both; }
        .nf-content > *:nth-child(1) { animation-delay: 0.1s; }
        .nf-content > *:nth-child(2) { animation-delay: 0.22s; }
        .nf-content > *:nth-child(3) { animation-delay: 0.34s; }
        .nf-content > *:nth-child(4) { animation-delay: 0.46s; }
        .nf-content > *:nth-child(5) { animation-delay: 0.58s; }
      `}</style>

      <div className="relative w-44 h-44 mb-10 select-none">
        <div className="nf-disc w-44 h-44 rounded-full bg-[#1a1a1a] border-2 border-[#2a2a2a] flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.6)]">
          {[56, 80, 100, 124].map((d) => (
            <div key={d} className="absolute rounded-full border border-[#252525]" style={{ width: d, height: d }} />
          ))}
          <div className="relative z-10 w-14 h-14 rounded-full bg-[var(--green)] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            <span className="text-[9px] font-black text-black leading-tight tracking-tight text-center">MO<br />GUK</span>
          </div>
        </div>
        <div className="nf-needle absolute top-[-8px] right-[-10px]" style={{ width: 6, height: 64 }}>
          <div className="w-1 bg-gradient-to-b from-[#b0b0b0] to-[#888] rounded-full h-full mx-auto" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#aaa] border border-[#888] absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      <div className="nf-content space-y-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.07)] border border-[var(--hairline)] text-xs font-bold text-[var(--green)] tracking-widest uppercase">
          재생 중지됨
        </span>
        <h1 className="text-[44px] font-black text-text-base leading-none tracking-tight">404</h1>
        <p className="text-[17px] font-semibold text-text-base">이 페이지는 존재하지 않습니다</p>
        <p className="text-sm text-text-secondary max-w-[34ch] mx-auto leading-relaxed">
          요청하신 페이지를 찾을 수 없습니다.<br />주소를 확인하거나 홈으로 돌아가세요.
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
