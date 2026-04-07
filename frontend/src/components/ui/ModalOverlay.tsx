'use client';

import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalOverlayProps {
  children: ReactNode;
  onClose?: () => void;
  /** 표준 사이즈. 기본 'md'. 모달 너비 일관성을 위해 가급적 이 값만 사용. */
  size?: ModalSize;
  /** 추가 클래스 (배경색 등) */
  className?: string;
}

export default function ModalOverlay({ children, onClose, size = 'md', className = '' }: ModalOverlayProps) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`modal-content size-${size} ${className}`.trim()}>
        {children}
      </div>
    </div>
  );
}
