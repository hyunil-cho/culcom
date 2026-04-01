'use client';

import { useState } from 'react';

interface AlertModalProps {
  message: string;
}

export default function AlertModal({ message }: AlertModalProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      style={{
        display: 'flex', position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)', zIndex: 10000,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'white', borderRadius: 12,
        width: '90%', maxWidth: 400,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        textAlign: 'center', padding: '2rem 1.5rem',
      }}>
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
    </div>
  );
}
