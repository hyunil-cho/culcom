'use client';

import { useState } from 'react';

type TabKey = 'level0' | 'level1' | 'level2' | 'freetalking';

interface Panel {
  key: TabKey;
  label: string;
  badge: string;
  title: string;
  target: string;
  items: string[];
}

const PANELS: Panel[] = [
  {
    key: 'level0',
    label: 'Level 0',
    badge: '👶 Level 0',
    title: '왕초보',
    target: '대상: 영어가 처음이거나 오랫동안 손을 놓은 분',
    items: [
      '✔ 기초 인사 & 자기소개',
      '✔ 일상 표현 20가지 완벽 습득',
      '✔ 영어에 대한 두려움 제거',
      '✔ 짧은 문장으로 말문 트기',
    ],
  },
  {
    key: 'level1',
    label: 'Level 1',
    badge: '🌱 Level 1',
    title: '초급',
    target: '대상: 알파벳은 아는데 막상 말이 안 되는 분',
    items: [
      '✔ 일상 주제별 대화 패턴',
      '✔ 짧은 문장 → 연결 문장으로 확장',
      '✔ 쇼핑·음식·날씨 등 실전 표현',
      '✔ 소규모 그룹 대화 참여',
    ],
  },
  {
    key: 'level2',
    label: 'Level 2',
    badge: '🚀 Level 2',
    title: '중급',
    target: '대상: 단어는 아는데 문장이 막히는 분',
    items: [
      '✔ 토픽별 의견 말하기 훈련',
      '✔ 뉴스·이슈·문화 주제 토론',
      '✔ 자연스러운 영어 리듬 익히기',
      '✔ 즉흥 대화 반응 속도 향상',
    ],
  },
  {
    key: 'freetalking',
    label: 'Free Talking',
    badge: '💬 Free Talking',
    title: '프리토킹',
    target: '대상: 어느 정도 되는데 더 늘리고 싶은 분',
    items: [
      '✔ 제한 없는 자유 주제 대화',
      '✔ 고급 표현 & 슬랭 자연스럽게 활용',
      '✔ 원어민 감각 대화 훈련',
      '✔ 네트워킹 이벤트 우선 참여 기회',
    ],
  },
];

export default function ProgramTabsClient() {
  const [active, setActive] = useState<TabKey>('level0');
  return (
    <>
      <div className="program-tabs fade-up">
        {PANELS.map(p => (
          <button
            key={p.key}
            type="button"
            className={`tab-btn${active === p.key ? ' active' : ''}`}
            onClick={() => setActive(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="program-panels">
        {PANELS.map(p => (
          <div
            key={p.key}
            className={`program-panel${active === p.key ? ' active' : ''}`}
            id={`tab-${p.key}`}
          >
            <div className="program-badge">{p.badge}</div>
            <h3 className="program-title">{p.title}</h3>
            <p className="program-target">{p.target}</p>
            <ul className="program-list">
              {p.items.map(it => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
