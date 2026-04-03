'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface FormLayoutProps {
  title: string;
  backHref: string;
  backLabel?: string;
  submitLabel: string;
  onSubmit: () => void;
  /** true이면 수정 모드: 상단에 수정+취소, 하단 버튼 없음 */
  isEdit?: boolean;
  cardStyle?: React.CSSProperties;
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
  children,
}: FormLayoutProps) {
  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">{backLabel}</Link>
        {isEdit && (
          <div className="action-group" style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={onSubmit}>{submitLabel}</button>
            <Link href={backHref} className="btn-secondary">취소</Link>
          </div>
        )}
      </div>

      <div className="content-card" style={cardStyle}>
        <div className="form-header">
          <h2>{title}</h2>
        </div>
        <div className="form-body">
          {children}
        </div>
      </div>

      {!isEdit && (
        <div className="form-actions">
          <button className="btn-primary-large" onClick={onSubmit}>{submitLabel}</button>
          <Link href={backHref} className="btn-secondary-large">취소</Link>
        </div>
      )}
    </>
  );
}
