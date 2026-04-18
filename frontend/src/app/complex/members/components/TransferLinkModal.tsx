'use client';

import { useState } from 'react';
import { memberApi, transferApi, type MemberMembershipResponse, type TransferRequestItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useFormError } from '@/hooks/useFormError';
import { Select } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Button } from '@/components/ui/Button';
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

export default function TransferLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const [selectedMmSeq, setSelectedMmSeq] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<TransferRequestItem | null>(null);
  const { error: formError, setError, clear: clearError } = useFormError();

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

  const handleCreate = async () => {
    if (!selectedMmSeq || !selectedMs) { setError('양도할 멤버십을 선택하세요.'); return; }
    // 방어적 재검증 (선택 이후 상태가 바뀌었을 수 있으니)
    if (!isTransferable(selectedMs)) {
      setError('선택한 멤버십은 양도할 수 없습니다.');
      return;
    }
    clearError();
    setCreating(true);
    const res = await transferApi.create(Number(selectedMmSeq));
    if (res.success) setResult(res.data);
    else setError(res.message || '양도 요청 생성에 실패했습니다.');
    setCreating(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                        <div style={{
                          padding: 12,
                          background: blocked ? '#fef2f2' : '#f0fdf4',
                          border: `1px solid ${blocked ? '#fca5a5' : '#bbf7d0'}`,
                          borderRadius: 8, marginBottom: 14, fontSize: '0.85rem',
                          color: blocked ? '#991b1b' : '#166534',
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            <div>잔여: <strong>{selectedMs.totalCount - selectedMs.usedCount}회</strong></div>
                            <div>만료: <strong>{selectedMs.expiryDate}</strong></div>
                            <div>미수금: <strong>{selectedMs.outstanding != null ? `${selectedMs.outstanding.toLocaleString()}원` : '-'}</strong></div>
                            <div>양도: <strong>{selectedMs.transferable ? '가능' : '불가'}</strong></div>
                          </div>
                          {outstanding && (
                            <div style={{ marginTop: 8, fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠ 미수금이 있어 양도할 수 없습니다. 미수금 완납 후 진행해주세요.
                            </div>
                          )}
                          {notTransferable && (
                            <div style={{ marginTop: outstanding ? 4 : 8, fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠ 양도 불가 멤버십입니다.
                            </div>
                          )}
                          {isTransferred && (
                            <div style={{ marginTop: (outstanding || notTransferable) ? 4 : 8, fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠ 양도로 받은 멤버십은 재양도할 수 없습니다.
                            </div>
                          )}
                        </div>

                        <button onClick={handleCreate} disabled={creating || blocked}
                          style={{
                            width: '100%', padding: '10px', border: 'none', borderRadius: 6,
                            background: blocked ? '#d1d5db' : '#10b981',
                            color: blocked ? '#9ca3af' : '#fff',
                            fontWeight: 700, fontSize: '0.9rem', cursor: blocked ? 'not-allowed' : 'pointer',
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
