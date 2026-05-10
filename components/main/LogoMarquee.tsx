// 동아리 로고 무한 마키 S
const CLUBS = [
  { name: 'L-INK', abbr: 'OY', color: '#c0392b' },
  { name: '동아리 A', abbr: 'DA', color: '#e74c3c' },
  { name: '동아리 B', abbr: 'DB', color: '#c0392b' },
  { name: '동아리 C', abbr: 'DC', color: '#f1c40f' },
  { name: '동아리 D', abbr: 'DD', color: '#c0392b' },
  { name: '동아리 E', abbr: 'DE', color: '#e74c3c' },
  { name: '동아리 F', abbr: 'DF', color: '#c0392b' },
  { name: '동아리 G', abbr: 'DG', color: '#f1c40f' },
  { name: '동아리 H', abbr: 'DH', color: '#c0392b' },
  { name: '동아리 I', abbr: 'DI', color: '#e74c3c' },
  { name: '동아리 J', abbr: 'DJ', color: '#c0392b' },
  { name: '동아리 K', abbr: 'DK', color: '#f1c40f' },
  { name: '동아리 L', abbr: 'DL', color: '#c0392b' },
  { name: '동아리 M', abbr: 'DM', color: '#e74c3c' },
  { name: '동아리 N', abbr: 'DN', color: '#c0392b' },
];

// 시작과 끝이 이어지도록 두 배 복제 S
const ALL_CLUBS = [...CLUBS, ...CLUBS];

export default function LogoMarquee() {
  return (
    <div className="w-full overflow-hidden py-8 bg-gray-50 dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border">
      <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-4 tracking-widest uppercase">
        참여 동아리
      </p>
      <div className="relative flex overflow-hidden">
        {/* 좌우 페이드 마스크 */}
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-gray-50 dark:from-dark-surface to-transparent pointer-events-none" />

        <div
          className="flex gap-6 w-max"
          style={{
            animation: 'marquee 30s linear infinite',
          }}
        >
          {ALL_CLUBS.map((club, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg shadow-sm shrink-0 hover:scale-105 transition-transform duration-200"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: club.color }}
              >
                {club.abbr}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {club.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
