'use client';

import { useEffect, useState } from 'react';
import { postponementApi, type PostponementRequest } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ResultModal from '@/components/ui/ResultModal';

const STATUS_BADGE: Record<string, string> = {
  '대기': 'badge-warning',
  '승인': 'badge-success',
  '반려': 'badge-danger',
};

export default function PostponementsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PostponementRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // 반려 모달
  const [rejectTarget, setRejectTarget] = useState<PostponementRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = (p = page, status = statusFilter, kw = keyword) => {
    const params = [`page=${p}`, 'size=20'];
    if (status) params.push(`status=${status}`);
    if (kw) params.push(`keyword=${encodeURIComponent(kw)}`);
    postponementApi.list(params.join('&')).then(res => {
      setRequests(res.data.content);
      setTotalPages(res.data.totalPages);
    });
  };

  useEffect(() => { load(); }, []);

  const handlePageChange = (p: number) => {
    setPage(p);
    load(p);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(0);
    load(0, status);
  };

  const handleSearch = () => {
    setPage(0);
    load(0, statusFilter, keyword);
  };

  const handleStatusChange = async (req: PostponementRequest, newStatus: string) => {
    if (newStatus === req.status) return;

    if (newStatus === '반려') {
      setRejectTarget(req);
      setRejectReason('');
      return;
    }

    if (!confirm(`${req.memberName} 회원의 연기 요청 상태를 "${newStatus}"(으)로 변경하시겠습니까?`)) return;
    const res = await postponementApi.updateStatus(req.seq, newStatus);
    if (res.success) {
      setResult({ success: true, message: '상태가 변경되었습니다.' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { alert('반려 사유를 입력해주세요.'); return; }
    if (!rejectTarget) return;
    const res = await postponementApi.updateStatus(rejectTarget.seq, '반려', rejectReason);
    setRejectTarget(null);
    if (res.success) {
      setResult({ success: true, message: '반려 처리되었습니다.' });
    }
  };

  const columns: Column<PostponementRequest>[] = [
    { header: '요청일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '요청회원', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '시간대', render: (r) => <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>{r.timeSlot}</span> },
    { header: '현재수업', render: (r) => r.currentClass },
    { header: '연기기간', render: (r) => <span style={{ fontSize: '0.85rem' }}>{r.startDate} ~ {r.endDate}</span> },
    { header: '사유', render: (r) => <span style={{ maxWidth: 250, display: 'inline-block', textAlign: 'left' }}>{r.reason}</span> },
    {
      header: '상태',
      render: (r) => <span className={`badge ${STATUS_BADGE[r.status] ?? ''}`}>{r.status}</span>,
    },
    {
      header: '반려 사유',
      render: (r) => r.status === '반려' && r.rejectReason
        ? <span style={{ fontSize: '0.85rem', color: '#c92a2a' }}>{r.rejectReason}</span>
        : <span style={{ color: '#ccc' }}>-</span>,
    },
    {
      header: '처리',
      render: (r) => (
        <select
          value={r.status}
          onChange={(e) => handleStatusChange(r, e.target.value)}
          style={{
            padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem',
            border: '1px solid #ddd', cursor: 'pointer',
          }}
        >
          <option value="대기">대기</option>
          <option value="승인">승인</option>
          <option value="반려">반려</option>
        </select>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>연기 요청 관리</h2>
        <button className="btn-secondary" onClick={() => router.push(ROUTES.COMPLEX_POSTPONEMENT_REASONS)}>
          연기사유 관리
        </button>
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onReset={keyword ? () => { setKeyword(''); setPage(0); load(0, statusFilter, ''); } : undefined}
        placeholder="회원명 또는 연락처 검색"
        actions={
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
          >
            <option value="">전체 상태</option>
            <option value="대기">대기</option>
            <option value="승인">승인</option>
            <option value="반려">반려</option>
          </select>
        }
      />

      <DataTable
        columns={columns}
        data={requests}
        rowKey={(r) => r.seq}
        rowStyle={(r) => r.status === '승인' ? { backgroundColor: '#f0fdf4' } : undefined}
        emptyMessage="새로운 연기 요청이 없습니다."
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* 반려 사유 입력 모달 */}
      {rejectTarget && (
        <ModalOverlay onClose={() => setRejectTarget(null)}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #f44336' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>반려 사유 입력</h3>
          </div>
          <div style={{ padding: '1.5rem 2rem' }}>
            <div style={{
              background: '#fff5f5', border: '1px solid #ffa8a8', borderRadius: 8,
              padding: 12, marginBottom: 15, textAlign: 'center',
            }}>
              <strong style={{ color: '#c92a2a' }}>{rejectTarget.memberName}</strong> 회원의 연기 요청을
              <span className="badge badge-danger" style={{ marginLeft: 5 }}>반려</span> 합니다.
            </div>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', display: 'block', marginBottom: 8 }}>
              반려 사유 <span style={{ color: '#f44336' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요..."
              style={{
                width: '100%', height: 100, padding: 10,
                border: '1px solid #ddd', borderRadius: 6,
                resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{
            padding: '1rem 2rem', borderTop: '1px solid #e0e0e0',
            display: 'flex', gap: '0.75rem',
          }}>
            <button
              onClick={() => setRejectTarget(null)}
              style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: '1px solid #ddd', background: 'white', color: '#666',
                borderRadius: 6, cursor: 'pointer',
              }}
            >취소</button>
            <button
              onClick={handleRejectSubmit}
              style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem',
                border: 'none', background: '#f44336', color: 'white',
                borderRadius: 6, cursor: 'pointer',
              }}
            >반려 처리</button>
          </div>
        </ModalOverlay>
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
