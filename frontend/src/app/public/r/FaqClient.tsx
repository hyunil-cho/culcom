'use client';

import { useState } from 'react';

const FAQ: { q: string; a: string }[] = [
  {
    q: '영어를 전혀 못해도 참여할 수 있나요?',
    a: '네, 물론입니다! Level 0 과정은 영어가 전혀 처음인 분들을 위해 설계되었습니다. 알파벳을 읽을 줄 안다면 누구든 시작할 수 있어요. 편안한 분위기에서 부담 없이 첫 걸음을 내딛어 보세요.',
  },
  {
    q: '스터디는 어떻게 진행되나요?',
    a: '소규모 테이블(3~5명)로 모여 정해진 주제로 자유 대화를 합니다. 강의나 문법 설명 없이 100% 대화로만 진행됩니다. 세션 시작 전 짧은 주제 소개 후, 모든 시간을 말하기에 사용합니다.',
  },
  {
    q: '신청하면 바로 시작할 수 있나요?',
    a: '네! 신청 완료 후 카카오채널 또는 이메일로 일정 안내를 드립니다. 무료 체험은 신청 후 가장 가까운 스터디 일정으로 안내해 드립니다.',
  },
  {
    q: '레벨 테스트가 있나요?',
    a: '별도의 레벨 테스트는 없습니다. 신청 시 간단한 자기 평가 설문을 작성하시면, 담당자가 가장 적합한 레벨을 추천해 드립니다.',
  },
  {
    q: '외국인도 참여하나요?',
    a: '이벤트 세션에는 외국인 게스트가 참여하는 경우도 있습니다. 정규 스터디는 주로 한국인들끼리 진행되어 처음 시작하는 분들도 부담이 없습니다.',
  },
  {
    q: '준비물이 따로 있나요?',
    a: '별도 준비물은 필요 없습니다. 몸만 오시면 됩니다! 음료나 간단한 음식은 공간 내에서 구매하실 수 있습니다.',
  },
  {
    q: '한 달에 몇 번 참여할 수 있나요?',
    a: '멤버십 플랜에 따라 다릅니다. 기본 플랜은 주 1회, 프리미엄은 무제한 참여가 가능합니다. 자세한 내용은 신청 후 담당자가 안내해 드립니다.',
  },
];

export default function FaqClient() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="faq-list fade-up">
      {FAQ.map((f, i) => {
        const isOpen = openIdx === i;
        return (
          <div className="faq-item" key={f.q}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpenIdx(isOpen ? null : i)}
            >
              {f.q}
            </button>
            <div className={`faq-a${isOpen ? ' open' : ''}`}>
              <p>{f.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
