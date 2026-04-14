'use client';

interface FormErrorBannerProps {
  error: string | null;
}

export default function FormErrorBanner({ error }: FormErrorBannerProps) {
  if (!error) return null;

  return (
    <div style={{
      padding: '0.75rem 1rem',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      color: '#dc2626',
      fontSize: '0.9rem',
      fontWeight: 500,
      marginBottom: '1rem',
    }}>
      {error}
    </div>
  );
}
