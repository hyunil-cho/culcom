'use client';

import type { useConsent } from '@/hooks/useConsent';
import ConsentItemBlock from '@/components/ui/ConsentItemBlock';

interface ConsentStepProps {
  /** useConsent 훅의 반환값 */
  consent: ReturnType<typeof useConsent>;
  /** 안내 문구 */
  description?: string;
  /** 동의항목이 없을 때 표시할 메시지 */
  emptyMessage?: string;
  /** 버튼 텍스트 */
  buttonText?: string;
  /** 동의 완료 후 콜백 */
  onNext: (data: { consentItemSeq: number; agreed: boolean }[]) => void;
}

export default function ConsentStep({
  consent,
  description,
  emptyMessage = '등록된 동의항목이 없습니다.',
  buttonText = '동의하고 계속하기',
  onNext,
}: ConsentStepProps) {
  const { items, loading, error, agreements, toggle, allRequiredAgreed, validate, toSubmitData } = consent;

  const handleNext = () => {
    if (!validate()) {
      alert('필수 동의항목에 모두 동의해주세요.');
      return;
    }
    onNext(toSubmitData());
  };

  if (loading) return <div style={loadingStyle}>로딩 중...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;

  return (
    <div>
      {description && (
        <p style={descriptionStyle}>{description}</p>
      )}

      {items.length === 0 ? (
        <p style={emptyStyle}>{emptyMessage}</p>
      ) : (
        items.map(item => (
          <ConsentItemBlock
            key={item.seq}
            item={item}
            agreed={agreements.get(item.seq) ?? false}
            onToggle={(v) => toggle(item.seq, v)}
          />
        ))
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!allRequiredAgreed}
        style={{
          ...buttonStyle,
          background: allRequiredAgreed ? '#10b981' : '#d1d5db',
          color: allRequiredAgreed ? '#fff' : '#9ca3af',
          cursor: allRequiredAgreed ? 'pointer' : 'not-allowed',
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center', padding: '2rem', color: '#999',
};

const errorStyle: React.CSSProperties = {
  textAlign: 'center', padding: '2rem', color: '#dc2626',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.9rem', color: '#555', lineHeight: 1.6, marginBottom: '1.5rem',
};

const emptyStyle: React.CSSProperties = {
  color: '#999', textAlign: 'center', padding: '1rem 0',
};

const buttonStyle: React.CSSProperties = {
  width: '100%', padding: '14px 0', border: 'none', borderRadius: 8,
  fontSize: '1rem', fontWeight: 700, marginTop: 16, transition: 'all 0.2s',
};
