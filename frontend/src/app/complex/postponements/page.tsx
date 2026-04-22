'use client';

import { useState } from 'react';
import { postponementApi, type PostponementRequest } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AdminActionMessageModal from '../members/components/AdminActionMessageModal';
import { useResultModal } from '@/hooks/useResultModal';
import { useModal } from '@/hooks/useModal';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import { MEMBERSHIP_RELATED } from '@/lib/invalidate';
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
  // 연기 승인 시 만료일이 연장되므로 멤버십 관련 캐시도 함께 무효화.
  const { run, modal } = useResultModal({ invalidateKeys: ['postponements', ...MEMBERSHIP_RELATED] });

  const messageModal = useModal<{ req: PostponementRequest; newStatus: '승인' | '반려' }>();
  const infoAlert = useModal<string>();

  const handleStatusFilter = (status: string) => { setStatusFilter(status); list.load(0, { status, keyword }); };
  const handleSearch = () => { list.load(0, { status: statusFilter, keyword }); };

  const handleStatusChange = (req: PostponementRequest, newStatus: string) => {
    if (newStatus === req.status) return;
    if (req.status === '승인' || req.status === '반려') {
      infoAlert.open('이미 처리된 연기 요청은 상태를 변경할 수 없습니다.');
      return;
    }
    if (newStatus !== '승인' && newStatus !== '반려') return;
    messageModal.open({ req, newStatus });
  };

  const handleMessageSubmit = async (adminMessage: string) => {
    if (!messageModal.data) return;
    const { req, newStatus } = messageModal.data;
    messageModal.close();
    await run(
      postponementApi.updateStatus(req.seq, newStatus, adminMessage),
      newStatus === '승인' ? '승인 처리되었습니다.' : '반려 처리되었습니다.',
    );
  };

  const columns: Column<PostponementRequest>[] = [
    { header: '요청일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '요청회원', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '연기기간', render: (r) => <span className={s.dateRange}>{r.startDate} ~ {r.endDate}</span> },
    { header: '사유', render: (r) => <span className={s.reasonText}>{r.reason}</span> },
    { header: '희망 복귀 수업', render: (r) => r.desiredClassName
      ? <span className={s.reasonText}>
          <strong>{r.desiredClassName}</strong>
          {r.desiredTimeSlotName && <><br />{r.desiredTimeSlotName} {r.desiredStartTime && r.desiredEndTime ? `(${r.desiredStartTime}~${r.desiredEndTime})` : ''}</>}
        </span>
      : <span className={s.emptyText}>-</span> },
    { header: '상태', render: (r) => <span className={`badge ${STATUS_BADGE[r.status] ?? ''}`}>{r.status}</span> },
    { header: '관리자 메시지', render: (r) => r.adminMessage
      ? <span className={s.rejectReasonText}>{r.adminMessage}</span>
      : <span className={s.emptyText}>-</span> },
    { header: '처리', render: (r) => (r.status === '승인' || r.status === '반려') ? (
      <span className={s.emptyText}>처리 완료</span>
    ) : (
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

      {messageModal.isOpen && (
        <AdminActionMessageModal
          key={`${messageModal.data!.req.seq}-${messageModal.data!.newStatus}`}
          title={messageModal.data!.newStatus === '승인' ? '승인 메시지 입력' : '반려 사유 입력'}
          memberName={messageModal.data!.req.memberName}
          actionLabel={messageModal.data!.newStatus}
          summary="연기 요청을"
          inputLabel={messageModal.data!.newStatus === '승인' ? '승인 메시지' : '반려 사유'}
          placeholder={messageModal.data!.newStatus === '승인'
            ? '고객에게 전달할 메시지를 입력해주세요...'
            : '반려 사유를 입력해주세요...'}
          warning={
            <div style={{
              padding: '12px 14px',
              background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 6,
              color: '#991b1b', fontSize: '0.82rem', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, color: '#dc2626' }}>
                ⚠️ 처리 후에는 다른 상태로 변경할 수 없습니다.
              </div>
            </div>
          }
          onCancel={messageModal.close}
          onSubmit={handleMessageSubmit}
        />
      )}

      {infoAlert.isOpen && (
        <ConfirmModal
          title="알림"
          confirmLabel="확인"
          confirmColor="#4a90e2"
          onCancel={infoAlert.close}
          onConfirm={infoAlert.close}
        >
          <p style={{ margin: 0 }}>{infoAlert.data}</p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
