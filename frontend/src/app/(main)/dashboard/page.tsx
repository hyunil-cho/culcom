'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';

export default function DashboardPage() {
  const session = useSessionStore((s) => s.session);

  const router = useRouter();
  const noBranch = session && !session.selectedBranchSeq;

  return (
    <>
      <h2 className="page-title">대시보드</h2>

      {noBranch && (
        <div className="card" style={{
          backgroundColor: '#fff3cd', border: '1px solid #ffc107',
          padding: '1.5rem', marginBottom: 24,
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#856404', marginBottom: 8 }}>
            등록된 지점이 없습니다
          </div>
          <div style={{ fontSize: '0.9rem', color: '#856404', marginBottom: 12 }}>
            지점을 등록해야 고객 관리 등 주요 기능을 이용할 수 있습니다.
          </div>
          <button
            onClick={() => router.push('/branches')}
            style={{
              padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 500,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: '#4a90e2', color: 'white',
            }}
          >
            지점 등록하러 가기
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>현재 지점</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {session?.selectedBranchName ?? '-'}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>로그인 사용자</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {session?.userId ?? '-'}
          </div>
        </div>
      </div>
    </>
  );
}
