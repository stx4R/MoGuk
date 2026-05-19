// 전역 푸터 S
export default function Footer() {
  return (
    <footer className="w-full text-center py-6 text-sm text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-800">
      <p>© 2026 제 3회 오량모의국회. All rights reserved.</p>
      <p className="mt-1">
        Developed by{' '}
        <a
          href="http://stx4r.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          st4R
        </a>{' '}
        <a
          href="https://github.com/kmc11004"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          kmc
        </a>{' '}
        <a
          href="https://github.com/heejae0105"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          heejae
        </a>
      </p>
    </footer>
  );
}
