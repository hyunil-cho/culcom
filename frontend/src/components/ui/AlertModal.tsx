'use client';

import { useState } from 'react';
import ModalOverlay from './ModalOverlay';
import styles from './AlertModal.module.css';

interface AlertModalProps {
  message: string;
}

export default function AlertModal({ message }: AlertModalProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <ModalOverlay>
      <div className={styles.body}>
        <p className={styles.message}>{message}</p>
        <button onClick={() => setVisible(false)} className={styles.confirmBtn}>
          확인
        </button>
      </div>
    </ModalOverlay>
  );
}