import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NOTICE =
  '현재, "제 3회 오량모의국회 전자투표"의 운영정책 "제 2조 - 다 항"에 따라, 서비스는 종료되었습니다.';

const LETTER = `8주동안 긴 여정에 참여해주신 모든 참가자 및 운영진 여러분께 무한한 감사를 드립니다.
먼저, 모든 참가자 및 운영진 여러분의 열정과 노력 덕분에, 성황리에 제 3회 오량모의국회를 폐회할 수 있었습니다.
또 다시, 모든 참가자 및 운영진 여러분들이 58일 동안 보여주신 열정과 노력 덕분에
저 또한 이번 활동을 통해 느낀 점, 반성할 점, 개선해야할 점을 알 수 있어 뜻깊은 시간이 될 수 있었습니다.
모든 참가자 및 운영진 여러분들도 이번 활동이 뜻깊은 시간이 되었으면 좋겠습니다.
마지막으로, 모든 참가자 및 운영진 여러분들의 앞날에 축복이 가득하길 기도하며 마치겠습니다.
다시 한번 모든 참가자 및 운영진 여러분께 무한한 감사를 드립니다.`;

const adminLink =
  'text-text-base font-semibold underline underline-offset-[3px] decoration-[#5a5a5a] ' +
  'hover:text-green hover:decoration-current transition-colors duration-150';

export default function ClosedPage() {
  return (
    <div className="flex-1 flex px-6 py-14 md:py-8 md:[@media(min-height:700px)]:py-0">
      <div className="w-full max-w-[var(--maxw)] m-auto">
        <h1 className="font-black leading-none tracking-tight text-text-base text-[56px] md:text-[clamp(34px,6.5dvh,72px)]">
          :)
        </h1>
        <p className="mt-2 font-semibold text-text-secondary text-[17px] md:text-[clamp(12px,1.9dvh,19px)]">
          Error 410
        </p>

        <h2 className="mt-7 md:mt-[2.2dvh] font-bold text-text-base leading-snug text-[18px] md:text-[clamp(13px,2.2dvh,23px)]">
          제 3회 오량모의국회 전자투표 시스템이 서비스 종료 되었습니다.
        </h2>

        <div className="mt-5 md:mt-[1.8dvh] max-w-[72ch] flex flex-col gap-4 md:gap-[1.4dvh] text-text-secondary leading-[1.8] md:leading-[1.55] text-[13.5px] md:text-[clamp(9.5px,1.35dvh,14px)]">
          <p>{NOTICE}</p>
          <p className="whitespace-pre-line">{LETTER}</p>
          <p>
            <a
              href="https://stx4r.me"
              target="_blank"
              rel="noopener noreferrer"
              className={adminLink}
            >
              유이준
            </a>
            ,{' '}
            <a
              href="https://github.com/kmc11004"
              target="_blank"
              rel="noopener noreferrer"
              className={adminLink}
            >
              김민찬
            </a>{' '}
            웹 관리자 올림.
          </p>
        </div>
      </div>
    </div>
  );
}
