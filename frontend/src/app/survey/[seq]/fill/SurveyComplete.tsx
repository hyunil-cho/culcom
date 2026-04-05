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

          <div className={s.title}>🎉 상담 신청이 완료되었습니다!</div>
          <div className={s.name}>{displayName}님</div>
          <div className={s.thankText}>신청해주셔서 감사합니다.</div>
          <div className={s.contactText}>
            곧 <strong className={s.contactHighlight}>상담 연락</strong>을 드리겠습니다!
          </div>

          <div className={s.nextSteps}>
            <div className={s.nextStepsTitle}>📋 다음 단계</div>
            {['담당자가 연락처를 확인합니다', '빠른 시일 내에 전화를 드립니다', '상세한 상담을 진행합니다'].map((text, i) => (
              <div key={i} className={s.stepItem}>
                <span className={s.stepCheck}>✓</span>
                <span className={s.stepText}>{text}</span>
              </div>
            ))}
          </div>

          <div className={s.footer}>
            궁금하신 점이 있으시면<br />
            언제든지 <strong className={s.footerBold}>문의</strong>해주세요!
          </div>
        </div>
      </div>
    </div>
  );
}
