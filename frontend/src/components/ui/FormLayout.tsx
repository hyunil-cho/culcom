'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button, LinkButton } from './Button';

interface FormLayoutProps {
  title: string;
  backHref: string;
  backLabel?: string;
  submitLabel: string;
  onSubmit: () => void;
  /** true이면 수정 모드: 상단에 수정+취소, 하단 버튼 없음 */
  isEdit?: boolean;
  cardStyle?: React.CSSProperties;
  /** 제목 오른쪽에 렌더링할 추가 요소 */
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function FormLayout({
  title,
  backHref,
  backLabel = '← 목록으로',
  submitLabel,
  onSubmit,
  isEdit,
  cardStyle,
  headerExtra,
  children,
}: FormLayoutProps) {
  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">{backLabel}</Link>
        {isEdit && (
          <div className="action-group" style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onSubmit}>{submitLabel}</Button>
            <LinkButton href={backHref} variant="secondary">취소</LinkButton>
          </div>
        )}
      </div>

      <div className="content-card" style={cardStyle}>
        <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{title}</h2>
          {headerExtra}
        </div>
        <div className="form-body">
          {children}
        </div>
      </div>

      {!isEdit && (
        <div className="form-actions">
          <Button size="lg" onClick={onSubmit}>{submitLabel}</Button>
          <LinkButton href={backHref} variant="secondary" size="lg">취소</LinkButton>
        </div>
      )}
    </>
  );
}
