'use client';

import { useRouter } from 'next/navigation';
import ModalOverlay from './ModalOverlay';
import styles from './ResultModal.module.css';

interface ResultModalProps {
  success: boolean;
  message: string;
  redirectPath?: string;
  onConfirm?: () => void | Promise<void>;
}

export default function ResultModal({ success, message, redirectPath, onConfirm }: ResultModalProps) {
  const router = useRouter();

  const accentColor = success ? 'var(--success)' : 'var(--danger)';

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (redirectPath) {
      router.push(redirectPath);
    }
  };

  return (
    <ModalOverlay>
      <div className={styles.body}>
        <div className={styles.icon} style={{ background: accentColor }}>
          {success ? '✓' : '!'}
        </div>
        <h3 className={styles.title}>{success ? '성공' : '실패'}</h3>
        <p className={styles.message}>{message}</p>
        <button onClick={handleConfirm} className={styles.confirmBtn} style={{ background: accentColor }}>
          확인
        </button>
      </div>
    </ModalOverlay>
  );
}