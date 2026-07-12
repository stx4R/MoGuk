import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[64px] font-black text-text-base leading-none tracking-tight">404</h1>
      <p className="text-[18px] font-semibold text-text-secondary mt-3">Not Found</p>
      <Link href="/" className="mt-8 px-5 py-2.5 rounded-full bg-green text-black text-sm font-bold hover:brightness-110 transition-all">
        홈으로 가기
      </Link>
    </div>
  );
}
