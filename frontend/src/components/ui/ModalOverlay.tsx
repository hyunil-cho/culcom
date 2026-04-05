'use client';

import { ReactNode } from 'react';
import styles from './ModalOverlay.module.css';

interface ModalOverlayProps {
  children: ReactNode;
  onClose?: () => void;
}

export default function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`modal-content ${styles.inner}`}>
        {children}
      </div>
    </div>
  );
}