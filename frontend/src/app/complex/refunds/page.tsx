'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, refundApi, refundSurveyApi, type MembershipPaymentResponse, type RefundRequest, type RefundSurveyResponse } from '@/lib/api';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import { useApiQuery } from '@/hooks/useApiQuery';
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
import { MEMBERSHIP_RELATED } from '@/lib/invalidate';
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
  // 환불 승인 시 멤버십 상태·미수금·대시보드 지표에 영향.
  const { run, modal } = useResultModal({ invalidateKeys: ['refunds', ...MEMBERSHIP_RELATED] });

  const messageModal = useModal<{ req: RefundRequest; newStatus: '승인' | '반려' }>();
  const infoAlert = useModal<string>();
  const surveyModal = useModal<RefundSurveyResponse>();
  const paymentModal = useModal<RefundRequest>();
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
    { header: '결제방법', render: (r) => (
      r.memberSeq && r.memberMembershipSeq ? (
        <button
          type="button"
          onClick={() => paymentModal.open(r)}
          style={{
            padding: '4px 10px', border: '1px solid #4a90e2', borderRadius: 4,
            background: '#fff', color: '#4a90e2', fontSize: '0.78rem',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          결제 정보
        </button>
      ) : <span className={s.emptyText}>-</span>
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
        <ModalOverlay>
          <SurveyDetailView survey={surveyModal.data} onClose={surveyModal.close} />
        </ModalOverlay>
      )}

      {paymentModal.isOpen && paymentModal.data && (
        <ModalOverlay size="lg">
          <PaymentInfoView refund={paymentModal.data} onClose={paymentModal.close} />
        </ModalOverlay>
      )}

      {modal}
    </>
  );
}

function PaymentInfoView({ refund, onClose }: { refund: RefundRequest; onClose: () => void }) {
  const { methods, kinds } = usePaymentOptions();
  const methodLabel = (v: string | null) => methods.find(m => m.value === v)?.label ?? v ?? '-';
  const kindLabel = (v: string) => kinds.find(k => k.value === v)?.label ?? v;

  const { data: payments = [], isLoading } = useApiQuery<MembershipPaymentResponse[]>(
    ['refundMembershipPayments', refund.memberSeq, refund.memberMembershipSeq],
    () => memberApi.listPayments(refund.memberSeq!, refund.memberMembershipSeq!),
    { enabled: !!refund.memberSeq && !!refund.memberMembershipSeq },
  );

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <>
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid #e6ecf2',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#212529' }}>결제 정보</div>
          <div style={{ fontSize: '0.82rem', color: '#868e96', marginTop: 2 }}>
            {refund.memberName} · {refund.membershipName}
          </div>
        </div>
        <button type="button" onClick={onClose}
          style={{
            background: 'transparent', border: 'none', fontSize: '1.4rem',
            color: '#868e96', cursor: 'pointer', lineHeight: 1, padding: 4,
          }} aria-label="닫기">×</button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#868e96', padding: '2rem 0' }}>불러오는 중...</div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#868e96', padding: '2rem 0' }}>결제 내역이 없습니다.</div>
        ) : (
          <>
            <div style={{
              background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', color: '#495057', fontWeight: 600 }}>총 납부 합계</span>
              <span style={{ fontSize: '1.05rem', color: '#212529', fontWeight: 800 }}>
                {totalPaid.toLocaleString()}원
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafbfc', color: '#888', fontSize: 12 }}>
                  <th style={paymentTh}>일시</th>
                  <th style={paymentTh}>구분</th>
                  <th style={{ ...paymentTh, textAlign: 'right' }}>금액</th>
                  <th style={paymentTh}>결제수단</th>
                  <th style={paymentTh}>메모</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const isRefund = p.kind === 'REFUND' || p.amount < 0;
                  return (
                    <tr key={p.seq} style={{ borderTop: '1px solid #f1f3f5' }}>
                      <td style={paymentTd}>
                        <span style={{ fontFamily: 'monospace', color: '#666' }}>
                          {p.paidDate.replace('T', ' ').slice(0, 16)}
                        </span>
                      </td>
                      <td style={paymentTd}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: isRefund ? '#fff5f5' : '#eff6ff',
                          color: isRefund ? '#e03131' : '#2563eb',
                        }}>{kindLabel(p.kind)}</span>
                      </td>
                      <td style={{ ...paymentTd, textAlign: 'right', fontWeight: 700, color: isRefund ? '#e03131' : '#2e7d32' }}>
                        {p.amount.toLocaleString()}원
                      </td>
                      <td style={paymentTd}>
                        {methodLabel(p.method)}
                        {p.cardDetail && (
                          <div style={{ marginTop: 4, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
                            <div>{p.cardDetail.cardCompany} · {p.cardDetail.cardNumber}****</div>
                            <div>승인 {p.cardDetail.cardApprovalDate} / {p.cardDetail.cardApprovalNumber}</div>
                          </div>
                        )}
                      </td>
                      <td style={{ ...paymentTd, color: '#666' }}>{p.note || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e6ecf2' }}>
        <button type="button" onClick={onClose}
          style={{
            width: '100%', padding: 10, background: '#495057', color: 'white',
            border: 'none', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
          }}>닫기</button>
      </div>
    </>
  );
}

const paymentTh: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600 };
const paymentTd: React.CSSProperties = { padding: '10px 12px' };
