'use client';

import ModalOverlay from './ModalOverlay';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmColor?: string;
  headerColor?: string;
  children: React.ReactNode;
}

export default function ConfirmModal({
  title,
  onCancel,
  onConfirm,
  confirmLabel = '확인',
  confirmColor = '#4a90e2',
  headerColor,
  children,
}: ConfirmModalProps) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className={styles.header} style={{ borderBottom: `2px solid ${headerColor ?? confirmColor}` }}>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.body}>{children}</div>
      <div className={styles.footer}>
        <button className="btn-modal btn-modal-cancel" onClick={onCancel}>취소</button>
        <button className="btn-modal btn-modal-confirm" style={{ background: confirmColor }} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}