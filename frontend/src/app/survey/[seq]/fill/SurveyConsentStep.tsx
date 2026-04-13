'use client';

import { useConsent } from '@/hooks/useConsent';
import ConsentStep from '@/components/ui/ConsentStep';
import s from './page.module.css';

interface Props {
  templateName: string;
  onConsented: (data: { consentItemSeq: number; agreed: boolean }[]) => void;
}

export default function SurveyConsentStep({ templateName, onConsented }: Props) {
  const consent = useConsent({ category: 'SURVEY' });

  return (
    <div className={s.body}>
      <div className={s.wrapper}>
        <div className={s.header}>
          <div className={s.templateTitle}>{templateName}</div>
        </div>

        <div className={s.card}>
          <div className={s.sectionHeader}>
            <span className={s.sectionBadge}>Step 1</span>
            <span className={s.sectionTitle}>개인정보 처리방침 동의</span>
          </div>

          <ConsentStep
            consent={consent}
            description="설문을 시작하기 전에 아래 동의항목을 확인하고 동의해주세요."
            buttonText="동의하고 설문 시작하기"
            onNext={onConsented}
          />
        </div>

        <div className={s.footer}>입력하신 정보는 상담 목적으로만 사용됩니다.</div>
      </div>
    </div>
  );
}
