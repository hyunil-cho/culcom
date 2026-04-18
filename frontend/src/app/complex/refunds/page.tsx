'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { refundApi, refundSurveyApi, type RefundRequest, type RefundSurveyResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AdminActionMessageModal from '../members/components/AdminActionMessageModal';
import { useResultModal } from '@/hooks/useResultModal';
import { useModal } from '@/hooks/useModal';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import SurveyDetailView from './SurveyDetailView';
import s from './page.module.css';

const STATUS_BADGE: Record<string, string> = {
  '대기': 'badge-warning', '승인': 'badge-success', '반려': 'badge-danger',
};

export default function RefundsPage() {
  const router = useRouter();
  const list = useListPageQuery<RefundRequest>('refunds', (q) => refundApi.list(q));
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const { run, modal } = useResultModal({ onConfirm: () => list.load(list.pagination.page) });

  const messageModal = useModal<{ req: RefundRequest; newStatus: '승인' | '반려' }>();
  const infoAlert = useModal<string>();
  const surveyModal = useModal<RefundSurveyResponse>();
  const [surveyLoading, setSurveyLoading] = useState(false);

  const openSurvey = async (req: RefundRequest) => {
    if (surveyLoading) return;
    setSurveyLoading(true);
    try {
      const res = await refundSurveyApi.byRefund(req.seq);
      if (!res.success || !res.data) {
        infoAlert.open('해당 환불 요청에 연결된 설문이 없습니다.');
        return;
      }
      surveyModal.open(res.data);
    } catch (e: any) {
      infoAlert.open(e?.message ?? '설문을 불러오지 못했습니다.');
    } finally {
      setSurveyLoading(false);
    }
  };

  const handleStatusFilter = (status: string) => { setStatusFilter(status); list.load(0, { status, keyword }); };
  const handleSearch = () => { list.load(0, { status: statusFilter, keyword }); };

  const handleStatusChange = (req: RefundRequest, newStatus: string) => {
    if (newStatus === req.status) return;
    if (req.status === '승인' || req.status === '반려') {
      infoAlert.open('이미 처리된 환불 요청은 상태를 변경할 수 없습니다.');
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
      refundApi.updateStatus(req.seq, newStatus, adminMessage),
      newStatus === '승인' ? '승인 처리되었습니다.' : '반려 처리되었습니다.',
    );
  };

  const columns: Column<RefundRequest>[] = [
    { header: '요청일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '요청회원', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '멤버십', render: (r) => r.membershipName },
    { header: '기간', render: (r) => r.startDate && r.expiryDate
      ? <span className={s.periodText}>{r.startDate} ~ {r.expiryDate}</span>
      : <span className={s.emptyText}>-</span>,
    },
    { header: '수업 횟수', render: (r) => {
      if (r.totalCount == null || r.usedCount == null) return <span className={s.emptyText}>-</span>;
      const pct = r.totalCount > 0 ? Math.round(r.usedCount / r.totalCount * 100) : 0;
      return (
        <div>
          <div className={s.usageText}>{r.usedCount} / {r.totalCount}회 ({pct}%)</div>
          <div className={s.usageBar}><div className={s.usageFill} style={{ width: `${pct}%` }} /></div>
        </div>
      );
    }},
    { header: '연기', render: (r) => r.postponeUsed != null
      ? <span>{r.postponeUsed}회</span>
      : <span className={s.emptyText}>-</span>,
    },
    { header: '환불 금액', render: (r) => (
      r.price
        ? <div className={s.priceText}>{Number(r.price).toLocaleString()}원</div>
        : <span className={s.emptyText}>-</span>
    )},
    { header: '사유', render: (r) => <span className={s.reasonText}>{r.reason}</span> },
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
    { header: '설문', render: (r) => (
      <button
        type="button"
        onClick={() => openSurvey(r)}
        disabled={surveyLoading}
        style={{
          padding: '4px 10px', border: '1px solid #6366f1', borderRadius: 4,
          background: '#fff', color: '#6366f1', fontSize: '0.78rem',
          cursor: surveyLoading ? 'default' : 'pointer', fontWeight: 600,
        }}
      >
        설문 보기
      </button>
    )},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>환불 요청</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => router.push(ROUTES.COMPLEX_REFUND_SURVEYS)}>
            환불 설문
          </Button>
          <Button variant="secondary" onClick={() => router.push(ROUTES.COMPLEX_REFUND_REASONS)}>
            환불사유 관리
          </Button>
        </div>
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
        emptyMessage="환불 요청이 없습니다." pagination={list.pagination} />

      {messageModal.isOpen && (
        <AdminActionMessageModal
          key={`${messageModal.data!.req.seq}-${messageModal.data!.newStatus}`}
          title={messageModal.data!.newStatus === '승인' ? '환불 승인 메시지 입력' : '환불 반려 사유 입력'}
          memberName={messageModal.data!.req.memberName}
          actionLabel={messageModal.data!.newStatus}
          summary="환불 요청을"
          inputLabel={messageModal.data!.newStatus === '승인' ? '승인 메시지' : '반려 사유'}
          placeholder={messageModal.data!.newStatus === '승인'
            ? '고객에게 전달할 메시지를 입력해주세요...'
            : '반려 사유를 입력해주세요...'}
          warning={messageModal.data!.newStatus === '승인' ? (
            <div style={{
              padding: '12px 14px',
              background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 6,
              color: '#991b1b', fontSize: '0.82rem', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
                ⚠️ 되돌릴 수 없는 작업입니다
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>승인 후에는 다른 상태로 <strong>변경할 수 없습니다</strong>.</li>
                <li>해당 멤버십이 <strong>환불 상태</strong>로 전환됩니다.</li>
                <li>회원의 모든 <strong>수업 배정이 해제</strong>됩니다.</li>
              </ul>
            </div>
          ) : undefined}
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

      {surveyModal.isOpen && surveyModal.data && (
        <ModalOverlay onClose={surveyModal.close}>
          <SurveyDetailView survey={surveyModal.data} onClose={surveyModal.close} />
        </ModalOverlay>
      )}

      {modal}
    </>
  );
}
