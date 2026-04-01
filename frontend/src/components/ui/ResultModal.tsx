'use client';

import { useRouter } from 'next/navigation';

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
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: accentColor, margin: '0 auto 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.5rem', fontWeight: 'bold',
        }}>
          {success ? '✓' : '!'}
        </div>

        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
          {success ? '성공' : '실패'}
        </h3>
        <p style={{ margin: '0 0 1.5rem', color: '#666', fontSize: '0.95rem' }}>
          {message}
        </p>

        <button
          onClick={handleConfirm}
          style={{
            padding: '0.6rem 2rem', border: 'none', borderRadius: 8,
            background: accentColor, color: 'white',
            fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500,
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
