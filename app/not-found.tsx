// 404 페이지 S
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-extrabold text-red-primary dark:text-yellow-primary mb-4">
        404
      </p>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        페이지를 찾을 수 없습니다
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors"
      >
        <Home size={15} />
        메인으로 돌아가기
      </Link>
    </div>
  );
}
