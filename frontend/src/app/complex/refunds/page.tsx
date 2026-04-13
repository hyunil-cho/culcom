'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refundApi, externalApi, settingsApi, type RefundRequest } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useResultModal } from '@/hooks/useResultModal';
import { useModal } from '@/hooks/useModal';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import s from './page.module.css';

const STATUS_BADGE: Record<string, string> = {
  '대기': 'badge-warning', '승인': 'badge-success', '반려': 'badge-danger',
};

export default function RefundsPage() {
  const router = useRouter();
  const list = useListPageQuery<RefundRequest>('refunds', (q) => refundApi.list(q));
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const { run, showError, modal } = useResultModal({ onConfirm: () => list.load(list.pagination.page) });

  const rejectModal = useModal<RefundRequest>();
  const [rejectReason, setRejectReason] = useState('');
  const confirmModal = useModal<{ req: RefundRequest; newStatus: string }>();
  const [approveMessage, setApproveMessage] = useState('');
  const infoAlert = useModal<string>();
  const [senderPhone, setSenderPhone] = useState('');

  useEffect(() => {
    settingsApi.getSenderNumbers().then(res => {
      if (res.success && res.data?.length) setSenderPhone(res.data[0]);
    });
  }, []);

  const sendNotificationSms = async (receiverPhone: string, message: string, subject: string) => {
    if (!senderPhone) {
      showError('환불 처리는 완료되었으나 SMS 발신번호가 설정되지 않아 메시지가 발송되지 않았습니다.');
      return;
    }
    try {
      const res = await externalApi.sendSms({ senderPhone, receiverPhone, message, subject });
      if (!res.success || !res.data?.success) {
        showError(`환불 처리는 완료되었으나 SMS 발송에 실패했습니다: ${res.data?.message || res.message || '알 수 없는 오류'}`);
      }
    } catch (e: any) {
      showError(`환불 처리는 완료되었으나 SMS 발송에 실패했습니다: ${e?.message ?? '알 수 없는 오류'}`);
    }
  };

  const handleStatusFilter = (status: string) => { setStatusFilter(status); list.load(0, { status, keyword }); };
  const handleSearch = () => { list.load(0, { status: statusFilter, keyword }); };

  const handleStatusChange = (req: RefundRequest, newStatus: string) => {
    if (newStatus === req.status) return;
    if (req.status === '승인') {
      infoAlert.open('이미 승인된 환불 요청은 상태를 변경할 수 없습니다.');
      return;
    }
    if (newStatus === '반려') { rejectModal.open(req); setRejectReason(''); return; }
    setApproveMessage('');
    confirmModal.open({ req, newStatus });
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmModal.data) return;
    const { req, newStatus } = confirmModal.data;
    if (newStatus === '승인' && !approveMessage.trim()) {
      infoAlert.open('회원에게 발송할 안내 메시지를 입력해주세요.');
      return;
    }
    confirmModal.close();
    const message = approveMessage;
    const res = await run(refundApi.updateStatus(req.seq, newStatus), '상태가 변경되었습니다.');
    if (res.success && newStatus === '승인' && req.phoneNumber) {
      await sendNotificationSms(req.phoneNumber, message, '환불 승인 안내');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { infoAlert.open('반려 사유를 입력해주세요.'); return; }
    if (!rejectModal.data) return;
    const target = rejectModal.data;
    const reason = rejectReason;
    rejectModal.close();
    const res = await run(refundApi.updateStatus(target.seq, '반려', reason), '반려 처리되었습니다.');
    if (res.success && target.phoneNumber) {
      await sendNotificationSms(target.phoneNumber, reason, '환불 반려 안내');
    }
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
    { header: '처리', render: (r) => r.status === '승인' ? (
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
        <h2 className="page-title" style={{ marginBottom: 0 }}>환불 요청 관리</h2>
        <Button variant="secondary" onClick={() => router.push(ROUTES.COMPLEX_REFUND_REASONS)}>
          환불사유 관리
        </Button>
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

      {rejectModal.isOpen && (
        <ModalOverlay onClose={rejectModal.close}>
          <div className={s.rejectHeader}><h3 className={s.rejectTitle}>환불 반려 사유 입력</h3></div>
          <div className={s.rejectBody}>
            <div className={s.rejectAlert}>
              <strong className={s.rejectAlertName}>{rejectModal.data!.memberName}</strong> 회원의 환불 요청을
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

      {confirmModal.isOpen && (
        <ConfirmModal
          title={confirmModal.data!.newStatus === '승인' ? '환불 승인' : '환불 상태 변경'}
          confirmLabel={confirmModal.data!.newStatus === '승인' ? '승인 처리' : '변경'}
          confirmColor={confirmModal.data!.newStatus === '승인' ? '#dc2626' : '#4a90e2'}
          onCancel={confirmModal.close}
          onConfirm={handleConfirmStatusChange}
        >
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: '0 0 12px' }}>
              <strong>{confirmModal.data!.req.memberName}</strong> 회원의 환불 요청을{' '}
              <strong>{confirmModal.data!.newStatus}</strong> 처리하시겠습니까?
            </p>
            {confirmModal.data!.newStatus === '승인' && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 6,
                color: '#991b1b', fontSize: '0.85rem', lineHeight: 1.6,
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
            )}
            {confirmModal.data!.newStatus === '승인' && (
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  회원에게 발송할 안내 메시지 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={approveMessage}
                  onChange={(e) => setApproveMessage(e.target.value)}
                  placeholder="승인 처리 후 회원에게 자동 발송될 메시지를 입력해주세요..."
                  rows={5}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 6, fontSize: '0.9rem', lineHeight: 1.5, resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}
          </div>
        </ConfirmModal>
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
