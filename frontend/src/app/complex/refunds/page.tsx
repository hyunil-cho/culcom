'use client';

import { useEffect, useState } from 'react';
import { refundApi, type RefundRequest } from '@/lib/api';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { useResultModal } from '@/hooks/useResultModal';
import s from './page.module.css';

const STATUS_BADGE: Record<string, string> = {
  '대기': 'badge-warning', '승인': 'badge-success', '반려': 'badge-danger',
};

export default function RefundsPage() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const { run, modal } = useResultModal({ onConfirm: () => load() });

  const [rejectTarget, setRejectTarget] = useState<RefundRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = (p = page, status = statusFilter, kw = keyword) => {
    const params = [`page=${p}`, 'size=20'];
    if (status) params.push(`status=${status}`);
    if (kw) params.push(`keyword=${encodeURIComponent(kw)}`);
    refundApi.list(params.join('&')).then(res => { setRequests(res.data.content); setTotalPages(res.data.totalPages); });
  };

  useEffect(() => { load(); }, []);
  const handlePageChange = (p: number) => { setPage(p); load(p); };
  const handleStatusFilter = (status: string) => { setStatusFilter(status); setPage(0); load(0, status); };
  const handleSearch = () => { setPage(0); load(0, statusFilter, keyword); };

  const handleStatusChange = async (req: RefundRequest, newStatus: string) => {
    if (newStatus === req.status) return;
    if (newStatus === '반려') { setRejectTarget(req); setRejectReason(''); return; }
    if (!confirm(`${req.memberName} 회원의 환불 요청 상태를 "${newStatus}"(으)로 변경하시겠습니까?`)) return;
    await run(refundApi.updateStatus(req.seq, newStatus), '상태가 변경되었습니다.');
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { alert('반려 사유를 입력해주세요.'); return; }
    if (!rejectTarget) return;
    setRejectTarget(null);
    await run(refundApi.updateStatus(rejectTarget.seq, '반려', rejectReason), '반려 처리되었습니다.');
  };

  const columns: Column<RefundRequest>[] = [
    { header: '요청일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '요청회원', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '멤버십', render: (r) => r.membershipName },
    { header: '결제/환불 금액', render: (r) => (
      <div>{r.price && <div className={s.priceText}>결제: {Number(r.price).toLocaleString()}원</div>}</div>
    )},
    { header: '사유', render: (r) => <span className={s.reasonText}>{r.reason}</span> },
    { header: '환불 계좌', render: (r) => (
      <div className={s.accountInfo}>
        <strong className={s.accountBank}>{r.bankName}</strong><br />
        {r.accountNumber}<br />({r.accountHolder})
      </div>
    )},
    { header: '상태', render: (r) => <span className={`badge ${STATUS_BADGE[r.status] ?? ''}`}>{r.status}</span> },
    { header: '반려 사유', render: (r) => r.status === '반려' && r.rejectReason
      ? <span className={s.rejectReasonText}>{r.rejectReason}</span>
      : <span className={s.emptyText}>-</span> },
    { header: '처리', render: (r) => (
      <select value={r.status} onChange={(e) => handleStatusChange(r, e.target.value)} className={s.statusSelect}>
        <option value="대기">대기</option><option value="승인">승인</option><option value="반려">반려</option>
      </select>
    )},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>환불 요청 관리</h2>
      </div>

      <SearchBar keyword={keyword} onKeywordChange={setKeyword} onSearch={handleSearch}
        onReset={keyword ? () => { setKeyword(''); setPage(0); load(0, statusFilter, ''); } : undefined}
        placeholder="회원명 또는 연락처 검색"
        actions={
          <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} className={s.filterSelect}>
            <option value="">전체 상태</option><option value="대기">대기</option><option value="승인">승인</option><option value="반려">반려</option>
          </select>
        }
      />

      <DataTable columns={columns} data={requests} rowKey={(r) => r.seq}
        rowStyle={(r) => r.status === '승인' ? { backgroundColor: '#f0fdf4' } : undefined}
        emptyMessage="환불 요청이 없습니다." pagination={{ page, totalPages, onPageChange: handlePageChange }} />

      {rejectTarget && (
        <ModalOverlay onClose={() => setRejectTarget(null)}>
          <div className={s.rejectHeader}><h3 className={s.rejectTitle}>환불 반려 사유 입력</h3></div>
          <div className={s.rejectBody}>
            <div className={s.rejectAlert}>
              <strong className={s.rejectAlertName}>{rejectTarget.memberName}</strong> 회원의 환불 요청을
              <span className="badge badge-danger" style={{ marginLeft: 5 }}>반려</span> 합니다.
            </div>
            <label className={s.rejectLabel}>반려 사유 <span className={s.requiredMark}>*</span></label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요..." className={s.rejectTextarea} />
          </div>
          <div className={s.rejectFooter}>
            <button onClick={() => setRejectTarget(null)} className={s.rejectCancelBtn}>취소</button>
            <button onClick={handleRejectSubmit} className={s.rejectSubmitBtn}>반려 처리</button>
          </div>
        </ModalOverlay>
      )}

      {modal}
    </>
  );
}
