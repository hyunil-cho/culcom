'use client';

import s from './SurveyComplete.module.css';
import pageStyles from './page.module.css';

interface SurveyCompleteProps {
  name: string;
}

export default function SurveyComplete({ name }: SurveyCompleteProps) {
  const displayName = name || '고객';

  return (
    <div className={pageStyles.body}>
      <div className={s.wrapper}>
        <div className={s.card}>
          <div className={s.checkCircle}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className={s.title}>상담 설문 작성이 완료되었습니다!</div>
          <div className={s.name}>[{displayName}]님, 반갑습니다.</div>
          <div className={s.contactText}>
            작성해 주신 소중한 정보를 바탕으로,<br />
            담당 매니저가 곧 <strong className={s.contactHighlight}>[{displayName}]님</strong>만을 위한<br />
            맞춤형 전문 상담을 도와드릴 예정입니다.
          </div>

          <div className={s.nextSteps}>
            <div className={s.nextStepsTitle}>💡 상담에서는 이런 내용을 다룹니다</div>
            {[
              { label: '동기 부여', desc: '학습 목적에 최적화된 상담 진행' },
              { label: '맞춤 설계', desc: '현재 레벨에 딱 맞는 커리큘럼 제안' },
              { label: '학습 솔루션', desc: '실질적인 레벨 상승을 위한 효과적인 공부법 안내' },
            ].map((item, i) => (
              <div key={i} className={s.stepItem}>
                <span className={s.stepCheck}>✓</span>
                <span className={s.stepText}><strong>{item.label}</strong>: {item.desc}</span>
              </div>
            ))}
          </div>

          <div className={s.footer}>
            변화의 시작을 <strong className={s.footerBold}>이웃(E-UT)</strong>이 함께하겠습니다.<br />
            설레는 마음으로 잠시만 기다려 주세요!
          </div>
          <div className={s.slogan}>Experience, You Together</div>
        </div>
      </div>
    </div>
  );
}
