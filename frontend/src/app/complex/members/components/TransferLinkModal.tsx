'use client';

import { useEffect, useState } from 'react';
import { memberApi, transferApi, type MemberMembershipResponse, type TransferRequestItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useFormError } from '@/hooks/useFormError';
import { Select, CurrencyInput } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Button } from '@/components/ui/Button';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import UnavailableNotice from './UnavailableNotice';
import CopyableUrlField from './CopyableUrlField';
import SmsSendSection from './SmsSendSection';
import { hasOutstanding, isTransferable } from '../membershipEligibility';
import shared from './LinkShared.module.css';
import s from './MembershipLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

/** 잔여 횟수 기반 권장 양도비 — 백엔드 {@code TransferService.calculateTransferFee}와 동일한 공식. */
function suggestedTransferFee(remaining: number): number {
  if (remaining <= 16) return 20000;
  if (remaining <= 48) return 30000;
  return 50000;
}

export default function TransferLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const [selectedMmSeq, setSelectedMmSeq] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [result, setResult] = useState<TransferRequestItem | null>(null);
  const { error: formError, setError, clear: clearError } = useFormError();
  const { submitting: creating, run } = useSubmitLock();

  const { data: allMemberships = [], isLoading: loading } = useApiQuery<MemberMembershipResponse[]>(
    ['transferLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );
  const activeMemberships = allMemberships.filter((ms) => ms.status === '활성');

  /** 양도 가능한 멤버십만 드롭다운에 노출 */
  const memberships = allMemberships.filter(isTransferable);

  const unavailableReason =
    activeMemberships.length === 0
      ? '활성 멤버십이 없습니다.'
      : memberships.length === 0
      ? '양도 가능한 멤버십이 없습니다. (미수금이 남아있거나, 양도 불가 상품이거나, 이미 양도받은 멤버십입니다.)'
      : '';
  const canTransfer = !unavailableReason;

  const transferUrl = result
    ? `${window.location.origin}/public/transfer?token=${result.token}`
    : '';
  const smsMessage = `[멤버십 양도 안내]\n\n${memberName}님, 아래 링크에서 양도 절차를 진행하실 수 있습니다.\n\n${transferUrl}`;

  const selectedMs = memberships.find((ms) => ms.seq === Number(selectedMmSeq));

  // 멤버십 선택 시 권장 양도비를 기본값으로 세팅
  useEffect(() => {
    if (!selectedMs) return;
    const remaining = Math.max(0, selectedMs.totalCount - selectedMs.usedCount);
    setTransferFee(String(suggestedTransferFee(remaining)));
  }, [selectedMs]);

  const numericFee = Number(transferFee.replace(/,/g, ''));
  const feeValid = !Number.isNaN(numericFee) && numericFee >= 0;

  const handleCreate = () => run(async () => {
    if (!selectedMmSeq || !selectedMs) { setError('양도할 멤버십을 선택하세요.'); return; }
    if (!isTransferable(selectedMs)) {
      setError('선택한 멤버십은 양도할 수 없습니다.');
      return;
    }
    if (!feeValid) {
      setError('양도비는 0 이상의 숫자여야 합니다.');
      return;
    }
    clearError();
    const res = await transferApi.create(Number(selectedMmSeq), numericFee);
    if (res.success) setResult(res.data);
    else setError(res.message || '양도 요청 생성에 실패했습니다.');
  });

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>멤버십 양도 링크</h3>
        </div>

        <div className={s.body}>
          <FormErrorBanner error={formError} />
          <div className={s.recipientInfo}>
            <div>
              <span className={s.infoLabel}>회원</span>
              <span className={s.infoValue}>{memberName}</span>
            </div>
            <div>
              <span className={s.infoLabel}>연락처</span>
              <span className={s.infoValue}>{memberPhone}</span>
            </div>
          </div>

          {!result && (
            <>
              {loading ? (
                <div className={shared.loadingText}>멤버십 정보 확인 중...</div>
              ) : !canTransfer ? (
                <UnavailableNotice title="양도 요청이 불가능합니다" description={unavailableReason} />
              ) : (
                <>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>양도할 멤버십 선택</label>
                    <Select value={selectedMmSeq} onChange={(e) => setSelectedMmSeq(e.target.value)}>
                      <option value="">-- 멤버십 선택 --</option>
                      {memberships.map((ms) => {
                        const rem = ms.totalCount - ms.usedCount;
                        return (
                          <option key={ms.seq} value={ms.seq}>
                            {ms.membershipName} (잔여 {rem}회, ~{ms.expiryDate})
                          </option>
                        );
                      })}
                    </Select>
                  </div>

                  {selectedMs && (() => {
                    const outstanding = hasOutstanding(selectedMs);
                    const notTransferable = !selectedMs.transferable;
                    const isTransferred = selectedMs.transferred;
                    const blocked = outstanding || notTransferable || isTransferred;

                    return (
                      <>
                        <MembershipUsagePanel ms={selectedMs} />

                        {/* 양도비 편집 */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                            양도비 <span style={{ color: '#dc2626' }}>*</span>
                          </div>
                          <CurrencyInput
                            value={transferFee}
                            onValueChange={setTransferFee}
                            placeholder="예: 30,000"
                          />
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>
                            권장 양도비는 잔여 횟수 기준입니다 — 16회 이하 20,000원 / 48회 이하 30,000원 / 그 이상 50,000원.
                            위 사용 이력을 참고해 관리자가 직접 조정할 수 있습니다.
                          </div>
                          {!feeValid && (
                            <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 6 }}>
                              0 이상의 숫자를 입력해주세요.
                            </div>
                          )}
                        </div>

                        {blocked && (
                          <div style={{
                            padding: 12, background: '#fef2f2', border: '1px solid #fca5a5',
                            borderRadius: 8, marginBottom: 14, fontSize: '0.82rem', color: '#991b1b',
                          }}>
                            {outstanding && <div style={{ fontWeight: 700 }}>⚠ 미수금이 있어 양도할 수 없습니다. 미수금 완납 후 진행해주세요.</div>}
                            {notTransferable && <div style={{ fontWeight: 700, marginTop: outstanding ? 4 : 0 }}>⚠ 양도 불가 멤버십입니다.</div>}
                            {isTransferred && <div style={{ fontWeight: 700, marginTop: (outstanding || notTransferable) ? 4 : 0 }}>⚠ 양도로 받은 멤버십은 재양도할 수 없습니다.</div>}
                          </div>
                        )}

                        <button onClick={handleCreate} disabled={creating || blocked || !feeValid}
                          style={{
                            width: '100%', padding: '10px', border: 'none', borderRadius: 6,
                            background: (blocked || !feeValid) ? '#d1d5db' : '#10b981',
                            color: (blocked || !feeValid) ? '#9ca3af' : '#fff',
                            fontWeight: 700, fontSize: '0.9rem',
                            cursor: (blocked || !feeValid) ? 'not-allowed' : 'pointer',
                          }}>
                          {creating ? '생성 중...' : blocked ? '양도 불가' : '양도 요청 생성'}
                        </button>
                      </>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {result && (
            <>
              <div style={{
                padding: 12, background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                borderRadius: 8, marginBottom: 14, fontSize: '0.82rem', color: '#15803d',
              }}>
                양도 요청이 생성되었습니다. (양도비: {result.transferFee.toLocaleString()}원, 잔여: {result.remainingCount}회)
              </div>

              <CopyableUrlField
                label="양도 페이지 URL"
                url={transferUrl}
                hint="이 링크를 양도자에게 전달하면, 양도 절차를 진행할 수 있습니다."
              />

              <SmsSendSection receiverPhone={memberPhone} initialMessage={smsMessage} />
            </>
          )}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}

/** 선택된 멤버십의 사용 이력(기간·납입·미수금·수업 진행)을 표시. */
function MembershipUsagePanel({ ms }: { ms: MemberMembershipResponse }) {
  const price = Number((ms.price ?? '').replace(/,/g, ''));
  const hasPrice = !!price && !Number.isNaN(price);
  const total = ms.totalCount ?? 0;
  const used = ms.usedCount ?? 0;
  const remaining = Math.max(0, total - used);
  const usageRatio = total > 0 ? used / total : 0;
  const remainingRatio = 1 - usageRatio;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = ms.startDate ? new Date(ms.startDate) : null;
  const expiry = ms.expiryDate ? new Date(ms.expiryDate) : null;
  const totalDays = start && expiry ? Math.max(1, Math.round((expiry.getTime() - start.getTime()) / 86400000)) : null;
  const daysElapsed = start ? Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000)) : null;
  const daysRemaining = expiry ? Math.max(0, Math.round((expiry.getTime() - today.getTime()) / 86400000)) : null;

  const paidAmount = ms.paidAmount ?? 0;
  const outstanding = ms.outstanding ?? 0;

  return (
    <div data-testid="transfer-usage-panel" style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
        멤버십 사용 이력
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', fontSize: '0.82rem' }}>
        <DetailRow label="멤버십" value={ms.membershipName} />
        <DetailRow label="상태" value={ms.status} />
        <DetailRow
          label="기간"
          value={start && expiry
            ? `${ms.startDate} ~ ${ms.expiryDate}${totalDays ? ` (${totalDays}일)` : ''}`
            : '-'}
        />
        <DetailRow
          label="경과 / 잔여"
          value={daysElapsed != null && daysRemaining != null
            ? `${daysElapsed}일 경과 / ${daysRemaining}일 잔여`
            : '-'}
        />
        <DetailRow label="결제 금액" value={hasPrice ? `${price.toLocaleString()}원` : '-'} />
        <DetailRow label="납입 금액" value={`${paidAmount.toLocaleString()}원`} />
        {outstanding > 0 && (
          <DetailRow label="미수금" value={`${outstanding.toLocaleString()}원`} danger />
        )}
        <DetailRow label="양도 가능" value={ms.transferable ? '가능' : '불가'} danger={!ms.transferable} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: 4 }}>
          <span>수업 사용</span>
          <span>
            <strong>{used}/{total}회</strong>
            {total > 0 && ` (사용 ${Math.round(usageRatio * 100)}% · 잔여 ${Math.round(remainingRatio * 100)}%)`}
          </span>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.round(usageRatio * 100)}%`, height: '100%',
            background: '#10b981', transition: 'width 0.2s',
          }} />
        </div>
        {total > 0 && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
          잔여 {remaining}회
        </div>}
      </div>
    </div>
  );
}

function DetailRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: danger ? '#dc2626' : '#0f172a' }}>{value}</div>
    </div>
  );
}
