'use client';

import { useState, type ReactNode } from 'react';
import ModalOverlay from '@/components/ui/ModalOverlay';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { useSubmitLock } from '@/hooks/useSubmitLock';

interface Props {
  /** 모달 제목. 예: "연기 승인 메시지 입력" */
  title: string;
  /** 대상 회원 이름 (상단 배너에 표시) */
  memberName: string;
  /** 액션 라벨. 상단 배너 배지와 요약에 사용. 예: "승인", "반려", "확인", "거절" */
  actionLabel: string;
  /** 상단 배너 문구 전체. 예: "XXX 회원의 연기 요청을 승인 합니다." */
  summary: ReactNode;
  /** 액션 색상 (성공/위험). 기본값은 반려/거절 → danger, 승인/확인 → success 자동 추론 */
  tone?: 'success' | 'danger';
  /** 입력 필드 라벨. 예: "승인 메시지", "반려 사유" */
  inputLabel: string;
  /** 입력 필드 placeholder */
  placeholder: string;
  /** 제출 버튼 라벨. 기본: actionLabel + " 처리" */
  submitLabel?: string;
  /** 입력 검증 실패 시 사용할 기본 에러 메시지 */
  emptyErrorMessage?: string;
  /** 추가 경고 콘텐츠 (승인 시 되돌릴 수 없다는 경고 등, 선택 사항) */
  warning?: ReactNode;
  /** 취소 클릭 */
  onCancel: () => void;
  /** 제출 클릭. message 인자를 받음. */
  onSubmit: (message: string) => void | Promise<void>;
}

/**
 * 연기/환불/양도 승인·반려 시 관리자가 메시지를 입력하는 공통 모달.
 * 3개 도메인에서 같은 패턴이 반복되므로 추출했다.
 */
export default function AdminActionMessageModal({
  title, memberName, actionLabel, summary, tone,
  inputLabel, placeholder, submitLabel,
  emptyErrorMessage, warning,
  onCancel, onSubmit,
}: Props) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { submitting, run } = useSubmitLock();

  const effectiveTone: 'success' | 'danger' = tone ?? (
    actionLabel === '승인' || actionLabel === '확인' ? 'success' : 'danger'
  );
  const borderColor = effectiveTone === 'success' ? '#10b981' : '#f44336';
  const submitBg = effectiveTone === 'success' ? '#10b981' : '#f44336';
  const badgeClass = effectiveTone === 'success' ? 'badge-success' : 'badge-danger';

  const handleSubmit = () => run(async () => {
    if (!message.trim()) {
      setError(emptyErrorMessage ?? `${inputLabel}을(를) 입력해주세요.`);
      return;
    }
    setError(null);
    await onSubmit(message);
  });

  return (
    <ModalOverlay>
      <div style={{ padding: '1.5rem 2rem', borderBottom: `2px solid ${borderColor}` }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <FormErrorBanner error={error} />
        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
          padding: 12, marginBottom: 14, fontSize: '0.9rem', textAlign: 'center',
        }}>
          <strong style={{ color: borderColor }}>{memberName}</strong>
          {' '}회원의 {summary}
          <span className={`badge ${badgeClass}`} style={{ marginLeft: 5 }}>{actionLabel}</span>
          {' '}합니다.
        </div>
        {warning && <div style={{ marginBottom: 14 }}>{warning}</div>}
        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: 8 }}>
          {inputLabel} <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', minHeight: 100, padding: 10,
            border: '1px solid #d1d5db', borderRadius: 6,
            resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <button onClick={onCancel} disabled={submitting} style={{
          flex: 1, padding: '0.75rem', fontSize: '0.95rem',
          border: '1px solid #d1d5db', background: '#fff', color: '#6b7280',
          borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer',
        }}>
          취소
        </button>
        <button onClick={handleSubmit} disabled={submitting} style={{
          flex: 1, padding: '0.75rem', fontSize: '0.95rem',
          border: 'none', background: submitBg, color: '#fff',
          borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer',
          fontWeight: 700, opacity: submitting ? 0.7 : 1,
        }}>
          {submitting ? '처리 중...' : (submitLabel ?? `${actionLabel} 처리`)}
        </button>
      </div>
    </ModalOverlay>
  );
}
