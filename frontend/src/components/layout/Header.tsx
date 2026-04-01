'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, branchApi, type Branch, type SessionInfo } from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    authApi.me().then(res => setSession(res.data)).catch(() => router.push('/login'));
    branchApi.list().then(res => setBranches(res.data)).catch(() => {});
  }, [router]);

  const handleBranchChange = async (branchSeq: number) => {
    await authApi.selectBranch(branchSeq);
    window.location.reload();
  };

  const handleLogout = async () => {
    await authApi.logout();
    router.push('/login');
  };

  return (
    <header style={{
      height: 56,
      backgroundColor: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>지점:</span>
        <select
          value={session?.selectedBranchSeq ?? ''}
          onChange={(e) => handleBranchChange(Number(e.target.value))}
          style={{ width: 'auto', padding: '4px 8px' }}
        >
          {branches.map((b) => (
            <option key={b.seq} value={b.seq}>{b.branchName}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14 }}>{session?.userId}</span>
        <button className="btn-secondary" onClick={handleLogout} style={{ fontSize: 13 }}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
