'use client';

import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalOverlayProps {
  children: ReactNode;
  /** 표준 사이즈. 기본 'md'. 모달 너비 일관성을 위해 가급적 이 값만 사용. */
  size?: ModalSize;
  /** 추가 클래스 (배경색 등) */
  className?: string;
}

// 백드롭 클릭으로는 닫지 않는다. 내부 상태 유실 방지를 위해 명시적 버튼(X/취소 등)으로만 닫도록 한다.
export default function ModalOverlay({ children, size = 'md', className = '' }: ModalOverlayProps) {
  return (
    <div className="modal-overlay">
      <div className={`modal-content size-${size} ${className}`.trim()}>
        {children}
      </div>
    </div>
  );
}
