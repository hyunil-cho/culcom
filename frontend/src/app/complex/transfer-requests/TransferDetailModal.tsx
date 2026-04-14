'use client';

import { useState } from 'react';
import { transferApi, type TransferRequestItem, type TransferStatus } from '@/lib/api';
import { useModal } from '@/hooks/useModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

const STEPS: { status: TransferStatus; label: string; desc: string }[] = [
  { status: '생성', label: '요청 생성', desc: '관리자가 양도 요청을 생성하고 양도자에게 URL을 전달했습니다.' },
  { status: '접수', label: '양수자 접수', desc: '양수자가 동의 및 정보를 제출했습니다.' },
  { status: '확인', label: '양도 확인', desc: '관리자가 양도를 최종 확인했습니다.' },
];

const STATUS_ORDER: TransferStatus[] = ['생성', '접수', '확인'];

function getStepIndex(status: TransferStatus): number {
  if (status === '거절') return -1;
  return STATUS_ORDER.indexOf(status);
}

export default function TransferDetailModal({
  item, onClose, onStatusChange,
}: {
  item: TransferRequestItem;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const currentStep = getStepIndex(item.status);
  const isRejected = item.status === '거절';
  const statusConfirmModal = useModal<TransferStatus>();

  const handleStatus = (status: TransferStatus) => {
    statusConfirmModal.open(status);
  };

  const confirmStatus = async () => {
    if (!statusConfirmModal.data) return;
    const status = statusConfirmModal.data;
    statusConfirmModal.close();
    setUpdating(true);
    await transferApi.updateStatus(item.seq, status);
    setUpdating(false);
    onStatusChange();
    onClose();
  };

  const transferUrl = `${window.location.origin}/public/transfer?token=${item.token}`;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ width: '90%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '1rem 1.5rem', background: '#6366f1', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>양도 요청 상세</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
          {/* 진행 상태 타임라인 */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#374151' }}>진행 상태</h4>
            {isRejected ? (
              <div style={{ padding: 12, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                거절됨 — 이 양도 요청은 거절되었습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 0 }}>
                {STEPS.map((step, i) => {
                  const done = i <= currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.status} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      {/* 연결선 */}
                      {i > 0 && (
                        <div style={{
                          position: 'absolute', top: 12, left: 0, right: '50%', height: 3,
                          background: i <= currentStep ? '#10b981' : '#e5e7eb',
                        }} />
                      )}
                      {i < STEPS.length - 1 && (
                        <div style={{
                          position: 'absolute', top: 12, left: '50%', right: 0, height: 3,
                          background: i < currentStep ? '#10b981' : '#e5e7eb',
                        }} />
                      )}
                      {/* 원 */}
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', margin: '0 auto 6px',
                        background: done ? '#10b981' : '#e5e7eb',
                        color: done ? '#fff' : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, position: 'relative', zIndex: 1,
                        border: active ? '2.5px solid #059669' : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500, color: done ? '#10b981' : '#9ca3af' }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 양도 정보 */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.85rem', color: '#374151' }}>
              <div><strong>멤버십:</strong> {item.membershipName}</div>
              <div><strong>잔여 횟수:</strong> {item.remainingCount}회</div>
              <div><strong>양도비:</strong> {item.transferFee.toLocaleString()}원</div>
              <div><strong>요청일:</strong> {item.createdDate?.split('T')[0] ?? '-'}</div>
            </div>
          </div>

          {/* 양도자 정보 */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700, marginBottom: 6 }}>양도자</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a' }}>{item.fromMemberName}</div>
            <div style={{ fontSize: '0.82rem', color: '#1e40af', fontFamily: 'monospace' }}>{item.fromMemberPhone}</div>
          </div>

          {/* 양수자 정보 */}
          <div style={{ background: item.toCustomerName ? '#f0fdf4' : '#f9fafb', border: `1.5px solid ${item.toCustomerName ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', color: item.toCustomerName ? '#15803d' : '#6b7280', fontWeight: 700, marginBottom: 6 }}>양수자</div>
            {item.toCustomerName ? (
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#14532d' }}>{item.toCustomerName}</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>아직 접수되지 않았습니다.</div>
            )}
          </div>

          {/* 양도자 URL */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>양도자 페이지 URL</div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
              {transferUrl}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(transferUrl)}
              style={{ marginTop: 6, padding: '4px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
            >
              복사
            </button>
          </div>

          {/* 초대 URL */}
          {item.inviteToken && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginBottom: 4 }}>양수자 초대 URL</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#166534', wordBreak: 'break-all' }}>
                {`${window.location.origin}/public/transfer/invite?token=${item.inviteToken}`}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/transfer/invite?token=${item.inviteToken}`)}
                style={{ marginTop: 6, padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
              >
                복사
              </button>
            </div>
          )}
        </div>

        {/* 푸터: 액션 버튼 */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {item.status === '접수' && (
            <>
              <button onClick={() => handleStatus('거절')} disabled={updating}
                style={{ padding: '8px 16px', background: '#fff', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                거절
              </button>
              <button onClick={() => handleStatus('확인')} disabled={updating}
                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                {updating ? '처리 중...' : '양도 확인'}
              </button>
            </>
          )}
          <button onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            닫기
          </button>
        </div>

        {statusConfirmModal.isOpen && (
          <ConfirmModal
            title="상태 변경 확인"
            confirmLabel={statusConfirmModal.data === '거절' ? '거절' : '확인'}
            confirmColor={statusConfirmModal.data === '거절' ? '#e03131' : undefined}
            onCancel={statusConfirmModal.close}
            onConfirm={confirmStatus}
          >
            {statusConfirmModal.data === '거절' ? '양도 요청을 거절하시겠습니까?' : '양도를 확인하시겠습니까?'}
          </ConfirmModal>
        )}
      </div>
    </div>
  );
}
