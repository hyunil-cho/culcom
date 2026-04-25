'use client';

import { useEffect, useMemo, useState } from 'react';
import { memberApi, publicLinkApi, type MemberMembershipResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/FormInput';
import UnavailableNotice from './UnavailableNotice';
import CopyableUrlField from './CopyableUrlField';
import SmsSendSection from './SmsSendSection';
import { isRefundable } from '../membershipEligibility';
import shared from './LinkShared.module.css';
import s from './RefundLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

/**
 * 기본 환불금액: 결제 금액 중 남은 수업 비율만큼.
 *   default = price × (totalCount - usedCount) / totalCount
 * totalCount=0 이거나 price가 파싱 불가면 price 원금을 그대로 사용.
 */
function calculateDefaultRefund(ms: MemberMembershipResponse): number {
  const price = Number((ms.price ?? '').replace(/,/g, ''));
  if (!price || Number.isNaN(price)) return 0;
  const total = ms.totalCount ?? 0;
  const used = ms.usedCount ?? 0;
  if (total <= 0) return price;
  const remainingRatio = Math.max(0, (total - used) / total);
  return Math.round(price * remainingRatio);
}

export default function RefundLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const { data: memberships = [], isLoading: msLoading } = useApiQuery<MemberMembershipResponse[]>(
    ['refundLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );

  const activeMemberships = useMemo(
    () => memberships.filter((m) => m.status === '활성'),
    [memberships],
  );

  const refundableMemberships = useMemo(
    () => memberships.filter(isRefundable),
    [memberships],
  );

  const { canRefund, unavailableReason } = useMemo(() => {
    if (activeMemberships.length === 0) {
      return { canRefund: false, unavailableReason: '활성 멤버십이 없습니다.' };
    }
    if (refundableMemberships.length === 0) {
      return {
        canRefund: false,
        unavailableReason: '모든 활성 멤버십에 미수금이 남아있어 환불 요청 링크를 생성할 수 없습니다. 미수금을 완납 후 진행해주세요.',
      };
    }
    return { canRefund: true, unavailableReason: '' };
  }, [activeMemberships, refundableMemberships]);

  // 선택된 멤버십 + 환불금액
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');

  // 멤버십 로드되면 환불 가능한 첫 항목 자동 선택 + 기본 환불금액 설정
  useEffect(() => {
    if (selectedSeq != null) return;
    if (refundableMemberships.length === 0) return;
    const first = refundableMemberships[0];
    setSelectedSeq(first.seq);
    setRefundAmount(String(calculateDefaultRefund(first)));
  }, [refundableMemberships, selectedSeq]);

  const selectedMs = refundableMemberships.find((m) => m.seq === selectedSeq);

  const handleSelectMembership = (ms: MemberMembershipResponse) => {
    setSelectedSeq(ms.seq);
    setRefundAmount(String(calculateDefaultRefund(ms)));
  };

  const numericAmount = Number(refundAmount.replace(/,/g, ''));
  const amountValid = !Number.isNaN(numericAmount) && numericAmount >= 0;

  // 사용자가 amount 를 빠르게 조정할 때 매 키 입력마다 코드를 발급하지 않도록 300ms 디바운스.
  // 디바운스 된 값만 queryKey 에 넣어 react-query 가 그 시점에만 새 발급을 트리거한다.
  const [debouncedAmount, setDebouncedAmount] = useState(numericAmount);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(numericAmount), 300);
    return () => clearTimeout(t);
  }, [numericAmount]);

  const linkEnabled = !!selectedMs && amountValid && debouncedAmount === numericAmount;

  const { data: link, isFetching: linkLoading } = useApiQuery(
    ['refundLinkCode', memberSeq, selectedMs?.seq, debouncedAmount],
    () => publicLinkApi.create({
      memberSeq,
      kind: '환불',
      memberMembershipSeq: selectedMs!.seq,
      refundAmount: debouncedAmount,
    }),
    { enabled: linkEnabled },
  );

  const refundUrl = link
    ? `${window.location.origin}/public/s/${link.code}`
    : '';
  const smsMessage = `[환불 요청 안내]\n\n${memberName}님, 아래 링크에서 환불 요청을 진행해주세요.\n\n${refundUrl}`;

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>환불 요청 링크</h3>
        </div>

        <div className={s.body}>
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

          {msLoading ? (
            <div className={shared.loadingText}>멤버십 정보 확인 중...</div>
          ) : !canRefund ? (
            <UnavailableNotice title="환불 요청이 불가능합니다" description={unavailableReason} />
          ) : (
            <>
              {/* 멤버십 선택 */}
              {refundableMemberships.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    환불할 멤버십 선택
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {refundableMemberships.map((ms) => {
                      const isSelected = ms.seq === selectedSeq;
                      return (
                        <label key={ms.seq} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', border: `1.5px solid ${isSelected ? '#4a90e2' : '#e5e7eb'}`,
                          borderRadius: 6, background: isSelected ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            name="refund-membership"
                            checked={isSelected}
                            onChange={() => handleSelectMembership(ms)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                              {ms.membershipName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                              {ms.usedCount}/{ms.totalCount}회 사용 · 결제 {ms.price ? `${Number(ms.price).toLocaleString()}원` : '-'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 선택된 멤버십 상세 정보 패널 */}
              {selectedMs && <MembershipDetailPanel ms={selectedMs} />}

              {/* 환불 금액 입력 */}
              {selectedMs && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    환불 금액 <span style={{ color: '#dc2626' }}>*</span>
                  </div>
                  <CurrencyInput
                    value={refundAmount}
                    onValueChange={setRefundAmount}
                    placeholder="예: 200,000"
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>
                    기본값은 <strong>결제금액 × 잔여 수업 비율</strong> 로 계산됩니다.
                    위의 멤버십 상세를 확인하고 금액을 직접 조정할 수 있습니다.
                  </div>
                  {!amountValid && (
                    <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 6 }}>
                      0 이상의 숫자를 입력해주세요.
                    </div>
                  )}
                </div>
              )}

              {selectedMs && amountValid && linkLoading && (
                <div className={shared.loadingText}>링크 생성 중...</div>
              )}

              {link && refundUrl && (
                <>
                  <CopyableUrlField
                    label="환불 요청 URL"
                    url={refundUrl}
                    hint={`환불 금액 ${numericAmount.toLocaleString()}원 이 미리 설정된 링크입니다.`}
                  />
                  <SmsSendSection receiverPhone={memberPhone} initialMessage={smsMessage} />
                </>
              )}
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

function MembershipDetailPanel({ ms }: { ms: MemberMembershipResponse }) {
  const price = Number((ms.price ?? '').replace(/,/g, ''));
  const hasPrice = !!price && !Number.isNaN(price);
  const total = ms.totalCount ?? 0;
  const used = ms.usedCount ?? 0;
  const remaining = Math.max(0, total - used);
  const usageRatio = total > 0 ? used / total : 0;
  const remainingRatio = 1 - usageRatio;

  // 기간 계산
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
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
        멤버십 상세 정보
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
      </div>

      {/* 수업 사용 진행 바 */}
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
            background: '#4a90e2', transition: 'width 0.2s',
          }} />
        </div>
        {total > 0 && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
          잔여 {remaining}회
        </div>}
      </div>

      {/* 기본 환불 금액 계산식 */}
      {hasPrice && total > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 12px', background: '#fff', border: '1px dashed #cbd5e1',
          borderRadius: 6, fontSize: '0.78rem', color: '#475569', lineHeight: 1.6,
        }}>
          <div style={{ color: '#64748b', marginBottom: 2 }}>기본 환불금액 계산</div>
          <div>
            {price.toLocaleString()}원 × {remaining}/{total}회 ={' '}
            <strong style={{ color: '#dc2626' }}>
              {Math.round(price * remainingRatio).toLocaleString()}원
            </strong>
          </div>
        </div>
      )}
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
