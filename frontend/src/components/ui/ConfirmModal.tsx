'use client';

import ModalOverlay from './ModalOverlay';

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
      <div style={{ padding: '1.5rem 2rem', borderBottom: `2px solid ${headerColor ?? confirmColor}` }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>{title}</h3>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
        {children}
      </div>
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.75rem', fontSize: '1rem',
            border: '1px solid #ddd', background: 'white', color: '#666',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '0.75rem', fontSize: '1rem',
            border: 'none', background: confirmColor, color: 'white',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}
