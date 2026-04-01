'use client';

import { useEffect, useState } from 'react';
import { userApi, SessionRole, type UserResponse } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ModalOverlay from '@/components/ui/ModalOverlay';

const ROLE_LABELS: Record<string, string> = {
  ROOT: '최고관리자',
  BRANCH_MANAGER: '지점장',
  STAFF: '직원',
};

export default function UsersPage() {
  const session = useSessionStore((s) => s.session);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<UserResponse | null>(null);
  const [form, setForm] = useState({ userId: '', password: '' });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = () => { userApi.list().then(res => setUsers(res.data)); };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await userApi.create({ userId: form.userId, password: form.password });
    if (res.success) {
      setShowCreate(false);
      setForm({ userId: '', password: '' });
      setResult({ success: true, message: '사용자가 생성되었습니다.' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await userApi.delete(deleting.seq);
    setDeleting(null);
    if (res.success) setResult({ success: true, message: '사용자가 삭제되었습니다.' });
  };

  const creatingRole = SessionRole.isRoot(session) ? '지점장' : '직원';

  return (
    <>
      <div className="content-card action-bar">
        <div className="search-section">
          <div className="action-buttons">
            {SessionRole.canManageUsers(session) && (
              <button className="btn-primary btn-nav" onClick={() => setShowCreate(true)}>
                + {creatingRole} 추가
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="table-header">
          <div className="table-info">
            <span>총 <strong>{users.length}</strong>명</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>역할</th>
              <th>생성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.seq}>
                <td><strong>{u.userId}</strong></td>
                <td><span className="status-badge status-active">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                <td>{u.createdDate}</td>
                <td>
                  {u.role !== 'ROOT' && (
                    <button className="btn-table-delete" onClick={() => setDeleting(u)}>
                      삭제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 생성 모달 */}
      {showCreate && (
        <ModalOverlay onClose={() => setShowCreate(false)}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>{creatingRole} 계정 생성</h3>
          </div>
          <form onSubmit={handleCreate} style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>아이디</label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="아이디를 입력하세요"
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>비밀번호</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="비밀번호를 입력하세요"
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: '1px solid #ddd', background: 'white', color: '#666',
                borderRadius: 6, cursor: 'pointer',
              }}>취소</button>
              <button type="submit" style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: 'none', background: '#4a90e2', color: 'white',
                borderRadius: 6, cursor: 'pointer',
              }}>생성</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* 삭제 확인 모달 */}
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{deleting.userId}</strong> ({ROLE_LABELS[deleting.role]}) 계정을 삭제하시겠습니까?
          <br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => { setResult(null); load(); }}
        />
      )}
    </>
  );
}
