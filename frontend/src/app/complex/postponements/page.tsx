'use client';

import { useState } from 'react';
import { postponementApi, type PostponementRequest } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import { useModal } from '@/hooks/useModal';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import s from './page.module.css';

const STATUS_BADGE: Record<string, string> = {
  '대기': 'badge-warning',
  '승인': 'badge-success',
  '반려': 'badge-danger',
};

export default function PostponementsPage() {
  const router = useRouter();
  const list = useListPageQuery<PostponementRequest>('postponements', (q) => postponementApi.list(q));
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const { run, modal } = useResultModal({ onConfirm: () => list.load(list.pagination.page) });

  const rejectModal = useModal<PostponementRequest>();
  const statusChangeModal = useModal<{ req: PostponementRequest; newStatus: string }>();
  const [rejectReason, setRejectReason] = useState('');
  const { error: formError, setError: setFormError, clear: clearFormError } = useFormError();

  const handleStatusFilter = (status: string) => { setStatusFilter(status); list.load(0, { status, keyword }); };
  const handleSearch = () => { list.load(0, { status: statusFilter, keyword }); };

  const handleStatusChange = (req: PostponementRequest, newStatus: string) => {
    if (newStatus === req.status) return;
    if (newStatus === '반려') { rejectModal.open(req); setRejectReason(''); return; }
    statusChangeModal.open({ req, newStatus });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeModal.data) return;
    const { req, newStatus } = statusChangeModal.data;
    statusChangeModal.close();
    await run(postponementApi.updateStatus(req.seq, newStatus), '상태가 변경되었습니다.');
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { setFormError('반려 사유를 입력해주세요.'); return; }
    clearFormError();
    if (!rejectModal.data) return;
    const target = rejectModal.data;
    rejectModal.close();
    await run(postponementApi.updateStatus(target.seq, '반려', rejectReason), '반려 처리되었습니다.');
  };

  const columns: Column<PostponementRequest>[] = [
    { header: '요청일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '요청회원', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '연기기간', render: (r) => <span className={s.dateRange}>{r.startDate} ~ {r.endDate}</span> },
    { header: '사유', render: (r) => <span className={s.reasonText}>{r.reason}</span> },
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
        <h2 className="page-title" style={{ marginBottom: 0 }}>연기 요청 관리</h2>
        <Button variant="secondary" onClick={() => router.push(ROUTES.COMPLEX_POSTPONEMENT_REASONS)}>연기사유 관리</Button>
      </div>

      <SearchBar keyword={keyword} onKeywordChange={setKeyword} onSearch={handleSearch}
        onReset={keyword ? () => { setKeyword(''); list.load(0, { status: statusFilter }); } : undefined}
        placeholder="회원명 또는 연락처 검색"
        actions={
          <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} className={s.filterSelect}>
            <option value="">전체 상태</option><option value="대기">대기</option><option value="승인">승인</option><option value="반려">반려</option>
          </select>
        }
      />

      <DataTable columns={columns} data={list.items} rowKey={(r) => r.seq}
        rowStyle={(r) => r.status === '승인' ? { backgroundColor: '#f0fdf4' } : undefined}
        emptyMessage="새로운 연기 요청이 없습니다." pagination={list.pagination} />

      {rejectModal.isOpen && (
        <ModalOverlay onClose={rejectModal.close}>
          <div className={s.rejectHeader}>
            <h3 className={s.rejectTitle}>반려 사유 입력</h3>
          </div>
          <div className={s.rejectBody}>
            <FormErrorBanner error={formError} />
            <div className={s.rejectAlert}>
              <strong className={s.rejectAlertName}>{rejectModal.data!.memberName}</strong> 회원의 연기 요청을
              <span className="badge badge-danger" style={{ marginLeft: 5 }}>반려</span> 합니다.
            </div>
            <label className={s.rejectLabel}>반려 사유 <span className={s.requiredMark}>*</span></label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요..." className={s.rejectTextarea} />
          </div>
          <div className={s.rejectFooter}>
            <button onClick={rejectModal.close} className={s.rejectCancelBtn}>취소</button>
            <button onClick={handleRejectSubmit} className={s.rejectSubmitBtn}>반려 처리</button>
          </div>
        </ModalOverlay>
      )}

      {statusChangeModal.isOpen && (
        <ConfirmModal
          title="상태 변경 확인"
          confirmLabel="확인"
          onCancel={statusChangeModal.close}
          onConfirm={confirmStatusChange}
        >
          {statusChangeModal.data!.req.memberName} 회원의 연기 요청 상태를 &quot;{statusChangeModal.data!.newStatus}&quot;(으)로 변경하시겠습니까?
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
