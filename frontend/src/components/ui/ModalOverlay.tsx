'use client';

import { ReactNode } from 'react';

interface ModalOverlayProps {
  children: ReactNode;
  onClose?: () => void;
}

export default function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
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
      }}>
        {children}
      </div>
    </div>
  );
}
