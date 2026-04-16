'use client';

import type { RefundSurveyResponse } from '@/lib/api';
import s from './surveys/page.module.css';

const BELONGING_LABELS: Record<number, string> = {
  1: '전혀 그렇지 않다', 2: '조금 그렇다', 3: '보통이다', 4: '그렇다', 5: '매우 그렇다',
};

export default function SurveyDetailView({ survey, onClose }: { survey: RefundSurveyResponse; onClose: () => void }) {
  return (
    <div className={s.detailContainer}>
      <div className={s.detailHeader}>
        <h3 className={s.detailTitle}>설문 응답 상세</h3>
        <span className={s.detailDate}>{survey.createdDate?.split('T')[0]}</span>
      </div>
      <div className={s.detailInfo}>
        <span><strong>{survey.memberName}</strong></span>
        <span className={s.detailPhone}>{survey.phoneNumber}</span>
      </div>
      <div className={s.detailBody}>
        <DetailRow label="1. E-UT에 참여한 기간은 얼마나 되셨나요?" value={survey.participationPeriod} />
        <DetailRow label="2. E-UT에서 소속감을 느끼셨나요?"
          value={`${survey.belongingScore}점 - ${BELONGING_LABELS[survey.belongingScore] ?? ''}`} />
        <DetailRow label="3. 팀 구성(합병/분리)이 참여 경험에 영향을 주었나요?" value={survey.teamImpact} />
        <DetailRow label="4. E-UT 등록 당시와 가장 달랐던 점" value={survey.differenceComment || '-'} long />
        <DetailRow label="5. 개선해야 할 부분" value={survey.improvementComment || '-'} long />
        <DetailRow label="6. 재수강 의향"
          value={`${'★'.repeat(survey.reEnrollScore)}${'☆'.repeat(5 - survey.reEnrollScore)} (${survey.reEnrollScore}점)`} />
      </div>
      <div className={s.detailFooter}>
        <button onClick={onClose} className={s.closeBtn}>닫기</button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={s.detailRow}>
      <div className={s.detailLabel}>{label}</div>
      <div className={long ? s.detailValueLong : s.detailValue}>{value}</div>
    </div>
  );
}
