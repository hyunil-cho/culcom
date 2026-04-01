'use client';

import { useState } from 'react';
import ModalOverlay from './ModalOverlay';

interface AlertModalProps {
  message: string;
}

export default function AlertModal({ message }: AlertModalProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <ModalOverlay>
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <p style={{ margin: '0 0 1.5rem', color: '#333', fontSize: '0.95rem', lineHeight: 1.6 }}>
          {message}
        </p>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '0.6rem 2rem', border: 'none', borderRadius: 8,
            background: 'var(--primary)', color: 'white',
            fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500,
          }}
        >
          확인
        </button>
      </div>
    </ModalOverlay>
  );
}
