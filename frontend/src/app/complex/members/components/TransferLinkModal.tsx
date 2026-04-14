'use client';

import { useEffect, useState } from 'react';
import { memberApi, transferApi, smsEventApi, externalApi, type MemberMembershipResponse, type TransferRequestItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useFormError } from '@/hooks/useFormError';
import { Select, Textarea } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Button } from '@/components/ui/Button';
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

  // SMS
  const [copied, setCopied] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  // 멤버십 목록 로드 (활성만)
  const { data: allMemberships = [], isLoading: loading } = useApiQuery<MemberMembershipResponse[]>(
    ['transferLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );
  const memberships = allMemberships.filter(ms => ms.status === '활성');

  // SMS 발신번호 로드
  const { data: senderNumbers = [] } = useApiQuery<string[]>(
    ['senderNumbers'],
    () => smsEventApi.getSenderNumbers(),
    { enabled: showSms },
  );
  useEffect(() => {
    if (senderNumbers.length > 0 && !senderPhone) setSenderPhone(senderNumbers[0]);
  }, [senderNumbers, senderPhone]);

  const transferUrl = result
    ? `${window.location.origin}/public/transfer?token=${result.token}`
    : '';

  // SMS 메시지 초기화
  useEffect(() => {
    if (showSms && transferUrl) {
      setMessage(`[멤버십 양도 안내]\n\n${memberName}님, 아래 링크에서 양도 절차를 진행하실 수 있습니다.\n\n${transferUrl}`);
    }
  }, [showSms, memberName, transferUrl]);

  const handleCreate = async () => {
    if (!selectedMmSeq) { setError('양도할 멤버십을 선택하세요.'); return; }
    clearError();
    setCreating(true);
    const res = await transferApi.create(Number(selectedMmSeq));
    if (res.success) setResult(res.data);
    else setError(res.message || '양도 요청 생성에 실패했습니다.');
    setCreating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transferUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || !senderPhone) return;
    setSending(true);
    const res = await externalApi.sendSms({ senderPhone, receiverPhone: memberPhone, message });
    setSending(false);
    if (res.success && res.data?.success) {
      setSendResult({ success: true, text: `전송 완료 (${res.data.msgType})` });
    } else {
      setSendResult({ success: false, text: res.data?.message || '전송 실패' });
    }
  };

  const selectedMs = memberships.find(ms => ms.seq === Number(selectedMmSeq));

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
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

          {/* 아직 양도 요청 생성 전 */}
          {!result && (
            <>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
                  멤버십 정보 확인 중...
                </div>
              ) : memberships.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
                  양도 가능한 활성 멤버십이 없습니다.
                </div>
              ) : (
                <>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>양도할 멤버십 선택</label>
                    <Select value={selectedMmSeq} onChange={e => setSelectedMmSeq(e.target.value)}>
                      <option value="">-- 멤버십 선택 --</option>
                      {memberships.map(ms => {
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
                    const hasOutstanding = selectedMs.outstanding != null && selectedMs.outstanding > 0;
                    const notTransferable = !selectedMs.transferable;
                    const isTransferred = selectedMs.transferred;
                    const blocked = hasOutstanding || notTransferable || isTransferred;

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
                          {hasOutstanding && (
                            <div style={{ marginTop: 8, fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠ 미수금이 있어 양도할 수 없습니다. 미수금 완납 후 진행해주세요.
                            </div>
                          )}
                          {notTransferable && (
                            <div style={{ marginTop: hasOutstanding ? 4 : 8, fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠ 양도 불가 멤버십입니다.
                            </div>
                          )}
                          {isTransferred && (
                            <div style={{ marginTop: (hasOutstanding || notTransferable) ? 4 : 8, fontWeight: 700, fontSize: '0.82rem' }}>
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

          {/* 양도 요청 생성 완료 → URL 표시 */}
          {result && (
            <>
              <div style={{
                padding: 12, background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                borderRadius: 8, marginBottom: 14, fontSize: '0.82rem', color: '#15803d',
              }}>
                양도 요청이 생성되었습니다. (양도비: {result.transferFee.toLocaleString()}원, 잔여: {result.remainingCount}회)
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>양도 페이지 URL</label>
                <div className={s.urlRow}>
                  <input readOnly value={transferUrl} className={s.urlInput}
                    onClick={e => (e.target as HTMLInputElement).select()} />
                  <button onClick={handleCopy} className={s.copyBtn}>
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <p className={s.urlHint}>이 링크를 양도자에게 전달하면, 양도 절차를 진행할 수 있습니다.</p>
              </div>

              {!showSms ? (
                <button onClick={() => setShowSms(true)} className={s.smsToggleBtn}>
                  문자로 전송하기
                </button>
              ) : (
                <div className={s.smsSection}>
                  <div className={s.smsDivider}>문자 전송</div>

                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>발신번호</label>
                    <Select value={senderPhone} onChange={e => setSenderPhone(e.target.value)}>
                      <option value="">발신번호를 선택하세요</option>
                      {senderNumbers.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </div>

                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>메시지 내용</label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)}
                      rows={6} style={{ resize: 'vertical', lineHeight: 1.6 }} />
                    <div className={s.charCount}>{message.length} / 2000자</div>
                  </div>

                  {sendResult && (
                    <div className={sendResult.success ? s.resultSuccess : s.resultError}>
                      {sendResult.text}
                    </div>
                  )}

                  <button onClick={handleSend} disabled={sending || !senderPhone}
                    className={s.sendBtn}>
                    {sending ? '전송 중...' : '문자 전송'}
                  </button>
                </div>
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
