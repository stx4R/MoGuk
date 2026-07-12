import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContactCopy from './ContactCopy';

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description: '제 3회 오량모의국회 자주 묻는 질문',
};

type QA = { q: string; a: string };

const FAQ: QA[] = [
  {
    q: '회원가입은 어떻게 하나요?',
    a: '회원가입은 운영진에게 사전 배정받은 이름과 OTP(일회용 비밀번호)가 있어야 가능합니다. 회원가입 페이지에서 배정 이름, OTP, 이메일, 8자 이상의 비밀번호를 입력하세요. 사전 승인 명단에 없는 이름으로는 가입할 수 없습니다.',
  },
  {
    q: '회원가입이 자꾸 실패해요.',
    a: '다음을 확인해주세요.\n· 배정 이름이 운영진이 알려준 것과 정확히 일치하는지(띄어쓰기 포함)\n· OTP가 정확한지\n· 이메일 형식이 올바른지\n· 비밀번호가 8자 이상인지\n이미 가입에 사용된 이름은 다시 가입할 수 없습니다. 그래도 실패하면 아래 연락처로 문의해주세요.',
  },
  {
    q: '로그인 직후 다시 로그인하라는 화면이 떠요.',
    a: '보안을 위한 서버 교차검증 과정에서 생기는 짧은 지연일 수 있습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.',
  },
  {
    q: '투표는 어떻게 하나요?',
    a: '로그인 후 상단 메뉴의 "투표"로 이동해 안건을 선택하고 찬성 / 반대 / 기권 중 하나를 고르면 됩니다. 한 안건당 1회만 투표할 수 있습니다.',
  },
  {
    q: '투표를 잘못 눌렀어요. 다시 바꿀 수 있나요?',
    a: '한 번 제출한 투표는 변경하거나 취소할 수 없습니다. 선택 전에 신중히 확인해주세요.',
  },
  {
    q: '투표 결과는 언제, 어디서 볼 수 있나요?',
    a: '운영진이 "결과 공개" 처리를 한 안건만 해당 안건 카드에 집계 결과가 표시됩니다. 공개 전까지 집계는 비공개로 유지되며, 다른 사람이 무엇에 투표했는지는 볼 수 없습니다.',
  },
  {
    q: '투표하려는 안건이 안 보이거나 마감됐어요.',
    a: '안건은 운영진이 열어야 투표할 수 있습니다. 중단되었거나 마감된 안건은 계속 표시되지만 투표는 불가하며, 결과 공개를 기다려주세요.',
  },
  {
    q: '계정이 차단되었거나 갑자기 로그아웃됐어요.',
    a: '운영정책 위반 시 관리자에 의해 이용이 제한되거나 세션이 종료될 수 있습니다. 문의 사항이 있으면 아래 연락처로 알려주세요.',
  },
  {
    q: '비밀번호나 이메일을 잊었어요. 혹은 계정을 도용당한 것 같아요.',
    a: '즉시 아래 연락처 또는 이메일로 운영진에게 알려주세요. 계정 도용이 의심되는 경우 최대한 빨리 신고해주시는 것이 안전합니다.',
  },
  {
    q: '이름이나 정당(성향)을 바꾸고 싶어요.',
    a: '이름은 가입 이후 변경할 수 없습니다. 정당·권한 등은 운영진이 관리하므로 변경이 필요하면 아래로 문의해주세요.',
  },
  {
    q: '휴대폰에서 앱처럼 사용하고 싶어요.',
    a: 'iPhone·iPad의 Safari에서 이 사이트에 접속한 뒤 공유 버튼 → "홈 화면에 추가"를 누르면, 주소창 없이 앱처럼 전체화면으로 실행할 수 있습니다.',
  },
  {
    q: '그 외 문의나 오류 신고는 어떻게 하나요?',
    a: '아래 "연락처 복사" 또는 "이메일 복사" 버튼으로 운영진 연락처를 복사해 문의해주세요. 오류를 발견하셨다면 어떤 화면에서 무엇을 하다 발생했는지 함께 알려주시면 빠른 해결에 도움이 됩니다.',
  },
];

export default function FaqPage() {
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
        자주 묻는 질문
      </h1>
      <p className="mt-3 text-[13px] text-text-secondary">최종 업데이트: 2026년 7월 12일</p>
      <p className="mt-7 text-[15px] leading-[1.75] text-text-near-white">
        제 3회 오량모의국회 이용 중 자주 접수되는 질문을 모았습니다. 원하는 답을 찾지 못하셨다면 페이지 하단으로 운영진에게 문의해주세요.
      </p>

      <div className="mt-10 space-y-8">
        {FAQ.map((item, i) => (
          <section key={i}>
            <div className="border-t border-[var(--hairline-strong)] pt-6">
              <h2 className="text-[17px] font-bold text-text-base leading-snug">
                <span className="text-green">Q.</span> {item.q}
              </h2>
            </div>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-text-secondary whitespace-pre-line">
              {item.a}
            </p>
          </section>
        ))}
      </div>

      <ContactCopy />
    </div>
  );
}
