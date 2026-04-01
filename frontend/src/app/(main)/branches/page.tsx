'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';

export default function BranchesPage() {
  const session = useSessionStore((s) => s.session);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const canEdit = SessionRole.isManager(session);

  const load = () => { branchApi.list().then(res => setBranches(res.data)); };

  useEffect(() => { load(); }, []);

  const handleDelete = async (seq: number) => {
    setDeleting(seq);
  };

  const confirmDelete = async () => {
    if (deleting === null) return;
    await branchApi.delete(deleting);
    setDeleting(null);
    load();
    refreshBranches();
  };

  return (
    <>
      {/* 상단 액션 버튼 */}
      {canEdit && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="search-section">
            <div className="action-buttons">
              <Link href="/branches/add" className="btn-primary" style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 8,
                fontSize: '0.95rem',
                fontWeight: 500,
                color: 'white',
                textDecoration: 'none',
              }}>
                + 지점 추가
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 지점 테이블 */}
      <div className="content-card">
        <div className="table-header">
          <div className="table-info">
            <span>총 <strong>{branches.length}</strong>개 지점</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>지점명</th>
              <th>영문코드</th>
              <th>담당자</th>
              <th>등록일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.seq}>
                <td><strong>{b.branchName}</strong></td>
                <td><span className="status-badge status-active">{b.alias}</span></td>
                <td>{b.branchManager ?? '-'}</td>
                <td>{b.createdDate ?? '-'}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/branches/${b.seq}`} className="btn-table-action">상세</Link>
                  {canEdit && (
                    <>
                      <Link href={`/branches/${b.seq}/edit`} className="btn-table-action">수정</Link>
                      <button
                        className="btn-table-action"
                        onClick={() => handleDelete(b.seq)}
                        style={{ background: '#f44336', color: 'white', border: 'none' }}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 삭제 확인 모달 */}
      {deleting !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}
          style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>삭제 확인</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
              <strong>{branches.find(b => b.seq === deleting)?.branchName}</strong> 지점을 삭제하시겠습니까?
              <br /><br />이 작업은 되돌릴 수 없습니다.
            </div>
            <div style={{
              padding: '1rem 2rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '0.75rem',
            }}>
              <button
                onClick={() => setDeleting(null)}
                style={{
                  flex: 1, padding: '0.75rem', fontSize: '1rem',
                  border: '1px solid #ddd', background: 'white', color: '#666',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1, padding: '0.75rem', fontSize: '1rem',
                  border: 'none', background: '#f44336', color: 'white',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
