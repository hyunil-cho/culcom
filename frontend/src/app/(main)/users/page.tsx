'use client';

import { useEffect, useState } from 'react';
import { userApi, branchApi, type UserResponse, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';

const ROLE_LABELS: Record<string, string> = {
  ROOT: '최고관리자',
  BRANCH_MANAGER: '지점장',
  STAFF: '직원',
};

export default function UsersPage() {
  const session = useSessionStore((s) => s.session);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<UserResponse | null>(null);
  const [form, setForm] = useState({ userId: '', password: '', branchSeqs: [] as number[] });
  const [error, setError] = useState('');

  const load = () => { userApi.list().then(res => setUsers(res.data)); };

  useEffect(() => {
    load();
    if (session?.role === 'ROOT') {
      branchApi.list().then(res => setAllBranches(res.data));
    }
  }, [session?.role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await userApi.create({
        userId: form.userId,
        password: form.password,
        ...(session?.role === 'ROOT' ? { branchSeqs: form.branchSeqs } : {}),
      });
      setShowCreate(false);
      setForm({ userId: '', password: '', branchSeqs: [] });
      load();
    } catch {
      setError('사용자 생성에 실패했습니다.');
    }
  };

  const toggleBranch = (seq: number) => {
    setForm(prev => ({
      ...prev,
      branchSeqs: prev.branchSeqs.includes(seq)
        ? prev.branchSeqs.filter(s => s !== seq)
        : [...prev.branchSeqs, seq],
    }));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await userApi.delete(deleting.seq);
    setDeleting(null);
    load();
  };

  const creatingRole = session?.role === 'ROOT' ? '지점장' : '직원';

  return (
    <>
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="search-section">
          <div className="action-buttons">
            {(session?.role === 'ROOT' || session?.role === 'BRANCH_MANAGER') && (
              <button className="btn-primary" onClick={() => setShowCreate(true)} style={{
                padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.95rem', fontWeight: 500,
              }}>
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
              <th>지점</th>
              <th>생성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.seq}>
                <td><strong>{u.userId}</strong></td>
                <td><span className="status-badge status-active">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                <td>{u.branches.map(b => b.branchName).join(', ') || '-'}</td>
                <td>{u.createdDate}</td>
                <td>
                  {u.role !== 'ROOT' && (
                    <button
                      className="btn-table-action"
                      onClick={() => setDeleting(u)}
                      style={{ background: '#f44336', color: 'white', border: 'none' }}
                    >
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
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          style={{
            display: 'flex', position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)',
            zIndex: 10000, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 12, width: '90%', maxWidth: 450,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>{creatingRole} 계정 생성</h3>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '2rem' }}>
              {error && (
                <div style={{
                  backgroundColor: '#fee2e2', color: '#991b1b',
                  padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 14,
                }}>{error}</div>
              )}
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
              {session?.role === 'ROOT' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    지점 선택 ({form.branchSeqs.length}개)
                  </label>
                  <div style={{
                    border: '1px solid #ddd', borderRadius: 6, padding: '0.5rem',
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {allBranches.map((b) => (
                      <label key={b.seq} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
                        backgroundColor: form.branchSeqs.includes(b.seq) ? '#e8f0fe' : 'transparent',
                      }}>
                        <input
                          type="checkbox"
                          checked={form.branchSeqs.includes(b.seq)}
                          onChange={() => toggleBranch(b.seq)}
                        />
                        {b.branchName}
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleting && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}
          style={{
            display: 'flex', position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)',
            zIndex: 10000, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 12, width: '90%', maxWidth: 400,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>삭제 확인</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
              <strong>{deleting.userId}</strong> ({ROLE_LABELS[deleting.role]}) 계정을 삭제하시겠습니까?
              <br /><br />이 작업은 되돌릴 수 없습니다.
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeleting(null)} style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: '1px solid #ddd', background: 'white', color: '#666',
                borderRadius: 6, cursor: 'pointer',
              }}>취소</button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: 'none', background: '#f44336', color: 'white',
                borderRadius: 6, cursor: 'pointer',
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
